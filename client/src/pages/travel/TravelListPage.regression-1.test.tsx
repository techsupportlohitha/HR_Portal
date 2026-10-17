// Regression: uploaded travel receipt URLs must survive form submission.
// Found by /qa on 2026-10-12.
// Report: .gstack/qa-reports/full-portal-20261012/report.md
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import TravelListPage from './TravelListPage';
import { travelApi } from '@/api/travel';
import apiClient from '@/api/client';

vi.mock('@/contexts/AuthContext', () => ({useAuth:()=>({user:{role:'EMPLOYEE',employeeId:'qa-employee'}})}));
vi.mock('@/hooks/usePermissions', () => ({usePermissions:()=>({canAdd:()=>true,canEdit:()=>false,canExport:()=>false,canApprove:()=>false})}));
vi.mock('@/api/travel', () => ({travelApi:{getAll:vi.fn().mockResolvedValue({data:[{id:'qa-travel',employee:{id:'qa-employee',firstName:'QA',lastName:'Employee'},approvalStatus:'APPROVAL_APPROVED',settlementStatus:'UNSETTLED',destination:'QA Office',startDate:'2030-01-07',endDate:'2030-01-08'}]}),create:vi.fn().mockResolvedValue({success:true})}}));
vi.mock('@/api/client', () => ({default:{put:vi.fn().mockResolvedValue({data:{success:true}})}}));
vi.mock('@/components/ui/FileUpload', () => ({FileUpload:({name,action}:{name:string;action:string})=><input data-testid="receipt-url" data-action={action} type="hidden" name={name} value="/api/uploads/qa-receipt.pdf"/>}));
vi.mock('@/components/ui/DatePicker', () => ({DatePicker:({name,label}:{name:string;label:string})=><label>{label}<input name={name} type="date"/></label>}));

const open = () => render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><TravelListPage/></QueryClientProvider>);
describe('Travel employee attachment submission',()=>{
  it('keeps the uploaded URL when creating a travel request',async()=>{
    open();
    fireEvent.click(screen.getByRole('button',{name:/New Travel Request/i}));
    fireEvent.change(screen.getByLabelText(/Start Date/),{target:{value:'2030-01-07'}});
    fireEvent.change(screen.getByLabelText(/End Date/),{target:{value:'2030-01-08'}});
    fireEvent.click(screen.getByLabelText('Flight'));
    fireEvent.click(screen.getByLabelText('Train'));
    fireEvent.change(screen.getByLabelText(/Outbound \(going\) amount/),{target:{value:'800'}});
    fireEvent.change(screen.getByLabelText(/Return \(coming back\) amount/),{target:{value:'450'}});
    fireEvent.submit(screen.getByRole('button',{name:'Submit Request'}).closest('form')!);
    await waitFor(()=>expect(travelApi.create).toHaveBeenCalledWith(expect.objectContaining({travelMode:'AIR',travelModes:['AIR','TRAIN'],outboundAmountRequired:800,returnAmountRequired:450,amountRequired:1250,billUpload:'/api/uploads/qa-receipt.pdf'})));
  });
  it('allows self-service claims and keeps their uploaded URL without staff edit permission',async()=>{
    open();
    fireEvent.click(await screen.findByTitle('Submit Expenses'));
    expect(screen.getByTestId('receipt-url')).toHaveAttribute('data-action','add');
    fireEvent.submit(screen.getByRole('button',{name:'Submit Expenses'}).closest('form')!);
    await waitFor(()=>expect(apiClient.put).toHaveBeenCalledWith('/travel/qa-travel/expenses',expect.objectContaining({billUpload:'/api/uploads/qa-receipt.pdf'})));
  });
});
