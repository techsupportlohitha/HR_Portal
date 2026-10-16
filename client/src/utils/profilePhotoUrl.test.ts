import { describe, expect, it } from 'vitest';
import { profilePhotoUrl } from './profilePhotoUrl';
describe('split-host profile images', () => {
 const front = 'https://hr.example.com';
 const api = 'https://backend.example.com/api';
 it('resolves relative and legacy frontend image URLs to the API', () => {
  expect(profilePhotoUrl('/api/uploads/photo-id', api, front)).toBe('https://backend.example.com/api/uploads/photo-id');
  expect(profilePhotoUrl(front + '/api/uploads/photo-id', api, front)).toBe('https://backend.example.com/api/uploads/photo-id');
 });
 it('supports local development and trailing slashes', () => {
  expect(profilePhotoUrl('/api/uploads/photo.jpg', '/api', 'http://localhost:5173')).toBe('http://localhost:5173/api/uploads/photo.jpg');
  expect(profilePhotoUrl('/api/uploads/photo.jpg', api + '/', front)).toBe('https://backend.example.com/api/uploads/photo.jpg');
 });
 it('preserves external images and local previews', () => {
  for (const value of ['https://cdn.example.com/photo.jpg', 'blob:https://hr.example.com/preview', 'data:image/png;base64,AA==']) expect(profilePhotoUrl(value, api, front)).toBe(value);
 });
});
