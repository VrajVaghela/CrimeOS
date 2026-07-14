
package analytics

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const (
	ParseStatusPending   = "PENDING"
	ParseStatusParsing   = "PARSING"
	ParseStatusParsed    = "PARSED"
	ParseStatusFailed    = "FAILED"
)

// FileMeta holds metadata about an uploaded file
type FileMeta struct {
	OriginalFilename string `bson:"original_filename" json:"original_filename"`
	MimeType         string `bson:"mime_type" json:"mime_type"`
	SizeBytes        int64  `bson:"size_bytes" json:"size_bytes"`
	StoragePath      string `bson:"storage_path" json:"storage_path"`
	SHA256           string `bson:"sha256" json:"sha256"`
}

// ParseError describes an error during parsing
type ParseError struct {
	Row    int    `bson:"row" json:"row"`
	Reason string `bson:"reason" json:"reason"`
	Raw    string `bson:"raw,omitempty" json:"raw,omitempty"`
}

// RawResponseDump mirrors MongoDB raw_response_dumps collection
type RawResponseDump struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	LegalRequestID    string             `bson:"legal_request_id" json:"legal_request_id"`
	CaseID            string             `bson:"case_id" json:"case_id"`
	FileMeta          FileMeta           `bson:"file_meta" json:"file_meta"`
	ParseStatus       string             `bson:"parse_status" json:"parse_status"`
	ParserUsed        string             `bson:"parser_used,omitempty" json:"parser_used,omitempty"`
	RowCountDetected  int                `bson:"row_count_detected,omitempty" json:"row_count_detected,omitempty"`
	RowCountParsed    int                `bson:"row_count_parsed,omitempty" json:"row_count_parsed,omitempty"`
	ParseErrors       []ParseError       `bson:"parse_errors,omitempty" json:"parse_errors,omitempty"`
	UploadedBy        string             `bson:"uploaded_by" json:"uploaded_by"`
	UploadedAt        time.Time          `bson:"uploaded_at" json:"uploaded_at"`
	ParsedAt          *time.Time         `bson:"parsed_at,omitempty" json:"parsed_at,omitempty"`
}

// MongoRepository interacts with MongoDB raw_response_dumps
type MongoRepository struct {
	collection *mongo.Collection
}

func NewMongoRepository(db *mongo.Database) *MongoRepository {
	return &MongoRepository{
		collection: db.Collection("raw_response_dumps"),
	}
}

// InsertDump inserts a new raw_response_dump doc
func (r *MongoRepository) InsertDump(ctx context.Context, doc RawResponseDump) (string, error) {
	doc.ID = primitive.NewObjectID()
	result, err := r.collection.InsertOne(ctx, doc)
	if err != nil {
		return "", fmt.Errorf("insert dump failed: %w", err)
	}
	oid, ok := result.InsertedID.(primitive.ObjectID)
	if !ok {
		return "", errors.New("invalid inserted id type")
	}
	return oid.Hex(), nil
}

// GetDump retrieves a dump by ID
func (r *MongoRepository) GetDump(ctx context.Context, id string) (RawResponseDump, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return RawResponseDump{}, fmt.Errorf("invalid object id: %w", err)
	}

	var doc RawResponseDump
	if err := r.collection.FindOne(ctx, bson.M{"_id": oid}).Decode(&doc); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return RawResponseDump{}, fmt.Errorf("dump not found: %w", err)
		}
		return RawResponseDump{}, fmt.Errorf("get dump failed: %w", err)
	}

	return doc, nil
}

// UpdateParseStatus updates the parse status and related fields
func (r *MongoRepository) UpdateParseStatus(ctx context.Context, id string, status string, rowsDetected, rowsParsed int, parseErrors []ParseError) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return fmt.Errorf("invalid object id: %w", err)
	}

	update := bson.M{
		"$set": bson.M{
			"parse_status":      status,
			"row_count_detected": rowsDetected,
			"row_count_parsed":   rowsParsed,
			"parse_errors":       parseErrors,
		},
	}
	if status == ParseStatusParsed {
		now := time.Now()
		update["$set"].(bson.M)["parsed_at"] = now
	}

	_, err = r.collection.UpdateByID(ctx, oid, update)
	if err != nil {
		return fmt.Errorf("update parse status failed: %w", err)
	}
	return nil
}

