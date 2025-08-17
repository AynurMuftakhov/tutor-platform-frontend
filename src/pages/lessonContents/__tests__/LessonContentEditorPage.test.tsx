import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LessonContentEditorPage from '../LessonContentEditorPage';
import { useLessonContentEditorStore } from '../../../store/lessonContentEditorStore';

vi.mock('../../../services/api', () => {
  return {
    getLessonContentById: vi.fn(async () => ({
      id: 'lc1',
      title: 'Untitled',
      status: 'DRAFT',
      tags: [],
      layout: {
        gridUnit: 8,
        snapToGrid: true,
        frames: {},
        nodes: {
          n1: { id: 'n1', type: 'IMAGE', x: 100, y: 100, w: 240, h: 160 },
        },
      },
      content: {
        n1: { url: 'https://example.com/pic.jpg', alt: '' },
      },
    })),
    publishLessonContent: vi.fn(async (id: string) => ({ id, status: 'PUBLISHED' })),
    unpublishLessonContent: vi.fn(async (id: string) => ({ id, status: 'DRAFT' })),
    updateLessonContent: vi.fn(async (id: string, patch: any) => ({ id, ...patch })),
  };
});

const renderEditor = async () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/lesson-contents/lc1/editor"]}>
        <Routes>
          <Route path="/lesson-contents/:id/editor" element={<LessonContentEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  // wait for inspector label to appear meaning page loaded
  await screen.findByText('Inspector');
};

describe('LessonContentEditorPage Inspector validation', () => {
  beforeEach(() => {
    // Reset store
    const st = useLessonContentEditorStore.getState();
    st.initFromServer({ id: null, layout: { gridUnit: 8, snapToGrid: true, frames: {}, nodes: {} }, content: {} });
  });

  it('disables Publish when Image.alt is missing, then enables after fixing', async () => {
    await renderEditor();

    // Select the image node programmatically (test helper)
    useLessonContentEditorStore.getState().setSelection(['n1']);

    // Publish should be disabled due to missing alt
    const publishBtn = await screen.findByRole('button', { name: /publish/i });
    expect(publishBtn).toBeDisabled();

    // Find Alt field and type a value
    const altField = await screen.findByLabelText(/alt/i);
    await userEvent.clear(altField);
    await userEvent.type(altField, 'A picture of a cat');

    // Wait a moment for debounce and validation
    await waitFor(() => expect(publishBtn).not.toBeDisabled());
  });
});
