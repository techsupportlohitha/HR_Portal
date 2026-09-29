import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';
import { Select } from './Select';
import { FileUpload } from './FileUpload';

describe('shared form controls', () => {
 it('associates an input label and error with its field', () => {
 render(<Input label="Email" required error="Enter a valid email" />);

 const input = screen.getByRole('textbox', { name: 'Email' });
 expect(input).toBeRequired();
 expect(input).toHaveAttribute('aria-invalid', 'true');
 expect(input).toHaveAccessibleDescription('Enter a valid email');
 });

 it('associates a select label with its field', () => {
 render(
 <Select label="Department" defaultValue="">
 <option value="">Select a department</option>
 <option value="engineering">Engineering</option>
 </Select>
 );

 expect(screen.getByRole('combobox', { name: 'Department' })).toBeInTheDocument();
 });

 it('associates the file upload label with its input', () => {
 render(<FileUpload name="documents" label="Documents" />);

 expect(screen.getByLabelText('Documents')).toHaveAttribute('type', 'file');
 });
});
