import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Modal } from './Modal';

function ModalHarness() {
 const [open, setOpen] = useState(false);

 return (
 <>
 <button type="button" onClick={() => setOpen(true)}>Open review</button>
 <Modal isOpen={open} onClose={() => setOpen(false)} title="Review details">
 <label htmlFor="review-note">Note</label>
 <input id="review-note" />
 <button type="button">Save</button>
 </Modal>
 </>
 );
}

describe('Modal', () => {
 it('has dialog semantics, closes with Escape, and restores focus', async () => {
 const user = userEvent.setup();
 render(<ModalHarness />);
 const opener = screen.getByRole('button', { name: 'Open review' });

 await user.click(opener);
 expect(screen.getByRole('dialog', { name: 'Review details' })).toBeInTheDocument();
 expect(screen.getByRole('button', { name: 'Close Review details' })).toHaveFocus();

 await user.keyboard('{Escape}');
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(opener).toHaveFocus();
 });
});
