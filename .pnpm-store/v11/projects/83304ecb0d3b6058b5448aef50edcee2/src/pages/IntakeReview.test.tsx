
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import IntakeReview from './IntakeReview';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as entitiesApi from '../api/entities';
import { AuthProvider } from '../context/AuthContext';
import { CaseProvider } from '../context/CaseContext';

vi.mock('../api/entities');

const mockListEntities = vi.mocked(entitiesApi.listEntities);
const mockExtractEntities = vi.mocked(entitiesApi.extractEntities);
const mockUpdateEntityStatus = vi.mocked(entitiesApi.updateEntityStatus);

const renderWithRouter = () => {
  render(
    <MemoryRouter initialEntries={['/cases/test-case-id/intake']}>
      <AuthProvider>
        <CaseProvider>
          <Routes>
            <Route path="/cases/:caseId/intake" element={<IntakeReview />} />
          </Routes>
        </CaseProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('IntakeReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListEntities.mockResolvedValue({ entities: [], total: 0 });
  });

  it('displays extract button disabled while loading', async () => {
    renderWithRouter();

    // Wait for initial entities to load
    await waitFor(() => {
      expect(mockListEntities).toHaveBeenCalled();
    });

    // Type in the textarea
    const textarea = screen.getByLabelText(/paste complaint text/i);
    fireEvent.change(textarea, { target: { value: 'test text' } });

    // Mock extract to be pending
    let resolveExtract: (value: any) => void;
    const extractPromise = new Promise((resolve) => {
      resolveExtract = resolve;
    });
    mockExtractEntities.mockReturnValue(extractPromise as any);

    // Click extract button
    const extractButton = screen.getByText(/extract entities/i);
    fireEvent.click(extractButton);

    // Check button is disabled and shows loading text
    await waitFor(() => {
      expect(screen.getByText('Extracting...')).toBeDisabled();
    });

    // Resolve the promise to clean up
    resolveExtract!({ entities: [] });
  });

  it('displays error message on 400 response', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(mockListEntities).toHaveBeenCalled();
    });

    const textarea = screen.getByLabelText(/paste complaint text/i);
    fireEvent.change(textarea, { target: { value: 'test' } });

    mockExtractEntities.mockRejectedValue({
      message: 'source_text is required',
      code: '400',
    });

    const extractButton = screen.getByText(/extract entities/i);
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByText('source_text is required')).toBeInTheDocument();
    });
  });

  it('removes confirm button after entity is confirmed', async () => {
    const testEntity = {
      id: 'test-id',
      case_id: 'test-case-id',
      complaint_ref_id: null,
      entity_type: 'EMAIL' as const,
      raw_value: 'test@example.com',
      normalized_value: 'test@example.com',
      source_text_offset: [0, 16] as [number, number],
      extracted_by: 'test-officer',
      status: 'EXTRACTED' as const,
      confidence_score: 0.95,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockListEntities.mockResolvedValue({ entities: [testEntity], total: 1 });
    mockUpdateEntityStatus.mockResolvedValue({
      entity: { ...testEntity, status: 'CONFIRMED' },
    });

    renderWithRouter();

    await waitFor(() => {
      // Check that we have the table
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(confirmButton).not.toBeInTheDocument();
      // Check the status is CONFIRMED in the table cell
      const statusCell = screen.getByRole('cell', { name: /CONFIRMED/i });
      expect(statusCell).toBeInTheDocument();
    });
  });
});
