
package analytics

import (
	"context"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"crimeos/digitalfootprint/internal/caselog"
	"crimeos/digitalfootprint/internal/model"
)

var knownVPNRanges []net.IPNet

func init() {
	// Demo dataset — replace with a real threat-intel feed/IP reputation API in production
	// These are just illustrative CIDR blocks
	vpnCIDRs := []string{
		"1.1.1.0/24", // Cloudflare DNS (not actual VPN range, demo only)
		"8.8.8.0/24", // Google DNS (not actual VPN range, demo only)
		"192.168.0.0/16", // Private range (demo only)
	}
	for _, cidr := range vpnCIDRs {
		_, ipNet, err := net.ParseCIDR(cidr)
		if err == nil {
			knownVPNRanges = append(knownVPNRanges, *ipNet)
		}
	}
}

func RunHeuristics(
	ctx context.Context,
	pgRepo *Repository,
	caseID, legalRequestID uuid.UUID,
	templateType string,
	caseLogPublisher caselog.Publisher,
) ([]model.IntelligenceFlag, error) {
	var flags []model.IntelligenceFlag

	switch templateType {
	case "CDR_REQUEST":
		cdrs, err := pgRepo.ListAllCDRRecords(ctx, legalRequestID)
		if err != nil {
			return nil, fmt.Errorf("list all cdr records: %w", err)
		}
		flags = append(flags, heuristicTowerClustering(ctx, cdrs, caseID, legalRequestID, caseLogPublisher)...)
	case "IP_LOG_REQUEST", "SUBSCRIBER_DETAILS_REQUEST":
		ips, err := pgRepo.ListAllIPSessionRecords(ctx, legalRequestID)
		if err != nil {
			return nil, fmt.Errorf("list all ip records: %w", err)
		}
		flags = append(flags, heuristicVPNProxyIP(ctx, ips, caseID, legalRequestID, caseLogPublisher)...)
	case "BANK_STATEMENT_REQUEST":
		txns, err := pgRepo.ListAllBankTransactionRecords(ctx, legalRequestID)
		if err != nil {
			return nil, fmt.Errorf("list all txn records: %w", err)
		}
		flags = append(flags, heuristicRepeatedCounterparty(ctx, txns, caseID, legalRequestID, caseLogPublisher)...)
		flags = append(flags, heuristicHighValueTransaction(ctx, txns, caseID, legalRequestID, caseLogPublisher)...)
	}

	return flags, nil
}

func heuristicVPNProxyIP(
	ctx context.Context,
	records []model.IPSessionRecord,
	caseID, legalRequestID uuid.UUID,
	caseLogPublisher caselog.Publisher,
) []model.IntelligenceFlag {
	var flags []model.IntelligenceFlag
	for _, rec := range records {
		ip := net.ParseIP(rec.IPAddress)
		if ip == nil {
			continue
		}
		for _, cidr := range knownVPNRanges {
			if cidr.Contains(ip) {
				flag := model.IntelligenceFlag{
					ID:             uuid.New(),
					CaseID:         caseID,
					LegalRequestID: legalRequestID,
					FlagType:       "VPN_PROXY_IP",
					Severity:       "HIGH",
					Summary: fmt.Sprintf(
						"IP address %s falls within known VPN/proxy range %s (demo dataset only)",
						rec.IPAddress, cidr.String(),
					),
					RawRowRefs: []string{rec.RawRowRef},
					RecordIDs:   []uuid.UUID{rec.ID},
					CreatedAt:   time.Now(),
				}
				flags = append(flags, flag)
				event := caselog.IntelEvent{
					CaseID:      caseID,
					Source:      "analytics_heuristics",
					Summary:     flag.Summary,
					Severity:    flag.Severity,
					OccurredAt:  time.Now(),
				}
				_ = caseLogPublisher.Publish(ctx, event)
				break
			}
		}
	}
	return flags
}

func heuristicRepeatedCounterparty(
	ctx context.Context,
	records []model.BankTransactionRecord,
	caseID, legalRequestID uuid.UUID,
	caseLogPublisher caselog.Publisher,
) []model.IntelligenceFlag {
	var flags []model.IntelligenceFlag
	upiCount := make(map[string][]model.BankTransactionRecord)
	acctCount := make(map[string][]model.BankTransactionRecord)

	for _, rec := range records {
		if rec.CounterpartyUPI != nil && *rec.CounterpartyUPI != "" {
			upiCount[*rec.CounterpartyUPI] = append(upiCount[*rec.CounterpartyUPI], rec)
		}
		if rec.CounterpartyAccount != nil && *rec.CounterpartyAccount != "" {
			acctCount[*rec.CounterpartyAccount] = append(acctCount[*rec.CounterpartyAccount], rec)
		}
	}

	for upi, recs := range upiCount {
		if len(recs) >= 3 {
			var ids []uuid.UUID
			var refs []string
			for _, r := range recs {
				ids = append(ids, r.ID)
				refs = append(refs, r.RawRowRef)
			}
			flag := model.IntelligenceFlag{
				ID:             uuid.New(),
				CaseID:         caseID,
				LegalRequestID: legalRequestID,
				FlagType:       "REPEATED_COUNTERPARTY",
				Severity:       "MEDIUM",
				Summary: fmt.Sprintf(
					"Counterparty UPI %s appears in %d transactions",
					upi, len(recs),
				),
				RawRowRefs: refs,
				RecordIDs:   ids,
				CreatedAt:   time.Now(),
			}
			flags = append(flags, flag)
		}
	}

	for acct, recs := range acctCount {
		if len(recs) >= 3 {
			var ids []uuid.UUID
			var refs []string
			for _, r := range recs {
				ids = append(ids, r.ID)
				refs = append(refs, r.RawRowRef)
			}
			flag := model.IntelligenceFlag{
				ID:             uuid.New(),
				CaseID:         caseID,
				LegalRequestID: legalRequestID,
				FlagType:       "REPEATED_COUNTERPARTY",
				Severity:       "MEDIUM",
				Summary: fmt.Sprintf(
					"Counterparty account %s appears in %d transactions",
					acct, len(recs),
				),
				RawRowRefs: refs,
				RecordIDs:   ids,
				CreatedAt:   time.Now(),
			}
			flags = append(flags, flag)
		}
	}

	return flags
}

func heuristicTowerClustering(
	ctx context.Context,
	records []model.CDRRecord,
	caseID, legalRequestID uuid.UUID,
	caseLogPublisher caselog.Publisher,
) []model.IntelligenceFlag {
	var flags []model.IntelligenceFlag
	towerCount := make(map[string][]model.CDRRecord)
	total := len(records)

	for _, rec := range records {
		if rec.CellTowerID != nil && *rec.CellTowerID != "" {
			towerCount[*rec.CellTowerID] = append(towerCount[*rec.CellTowerID], rec)
		}
	}

	for tower, recs := range towerCount {
		percent := float64(len(recs)) / float64(total)
		if percent >= 0.6 {
			var ids []uuid.UUID
			var refs []string
			for _, r := range recs {
				ids = append(ids, r.ID)
				refs = append(refs, r.RawRowRef)
			}
			flag := model.IntelligenceFlag{
				ID:             uuid.New(),
				CaseID:         caseID,
				LegalRequestID: legalRequestID,
				FlagType:       "TOWER_LOCATION_CLUSTER",
				Severity:       "LOW",
				Summary: fmt.Sprintf(
					"%.0f%% of calls in this batch come from tower %s — this is a probabilistic lead for officer review, not a legal conclusion",
					percent*100, tower,
				),
				RawRowRefs: refs,
				RecordIDs:   ids,
				CreatedAt:   time.Now(),
			}
			flags = append(flags, flag)
		}
	}

	return flags
}

func heuristicHighValueTransaction(
	ctx context.Context,
	records []model.BankTransactionRecord,
	caseID, legalRequestID uuid.UUID,
	caseLogPublisher caselog.Publisher,
) []model.IntelligenceFlag {
	var flags []model.IntelligenceFlag
	thresholdStr := os.Getenv("HIGH_VALUE_TXN_THRESHOLD")
	threshold := 200000 // Default ₹200,000
	if thresholdStr != "" {
		if t, err := strconv.Atoi(thresholdStr); err == nil {
			threshold = t
		}
	}

	for _, rec := range records {
		// Extract numeric value (remove commas, etc)
		cleanAmt := strings.ReplaceAll(rec.Amount, ",", "")
		amt, err := strconv.ParseFloat(cleanAmt, 64)
		if err != nil {
			continue
		}
		if amt >= float64(threshold) {
			flag := model.IntelligenceFlag{
				ID:             uuid.New(),
				CaseID:         caseID,
				LegalRequestID: legalRequestID,
				FlagType:       "HIGH_VALUE_TRANSACTION",
				Severity:       "HIGH",
				Summary: fmt.Sprintf(
					"Transaction %s has high value amount %s (threshold: ₹%d)",
					rec.TxnRef, rec.Amount, threshold,
				),
				RawRowRefs: []string{rec.RawRowRef},
				RecordIDs:   []uuid.UUID{rec.ID},
				CreatedAt:   time.Now(),
			}
			flags = append(flags, flag)
			event := caselog.IntelEvent{
				CaseID:      caseID,
				Source:      "analytics_heuristics",
				Summary:     flag.Summary,
				Severity:    flag.Severity,
				OccurredAt:  time.Now(),
			}
			_ = caseLogPublisher.Publish(ctx, event)
		}
	}
	return flags
}
