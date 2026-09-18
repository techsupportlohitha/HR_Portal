import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/ui/DataTable';

const dummyData = [
  { id: '1', name: 'Alice Smith', role: 'Developer', status: 'Active' },
  { id: '2', name: 'Bob Jones', role: 'Designer', status: 'On Leave' },
  { id: '3', name: 'Charlie Brown', role: 'Manager', status: 'Active' },
];

import { Column } from '@/components/ui/DataTable';

const columns: Column<any>[] = [
  { header: 'Name', accessor: 'name' },
  { header: 'Role', accessor: 'role' },
  { 
    header: 'Status', 
    accessor: (row) => (
      <Badge variant={row.status === 'Active' ? 'success' : 'warning'}>
        {row.status}
      </Badge>
    )
  },
];

export default function DesignSystemPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Design System Sandbox"
        description="Verify UI consistency across components in Light and Dark mode."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Colors */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-heading border-b border-slate-border pb-2">Colors & Branding</h2>
          <div className="flex flex-wrap gap-4">
            <div className="w-24 h-24 rounded-xl bg-brand-primary text-white flex items-end p-2 text-xs font-medium shadow-sm">Brand Primary</div>
            <div className="w-24 h-24 rounded-xl bg-sidebar text-white flex items-end p-2 text-xs font-medium shadow-sm">Sidebar Dark</div>
            <div className="w-24 h-24 rounded-xl bg-surface border border-slate-border text-text-heading flex items-end p-2 text-xs font-medium shadow-sm">Surface</div>
            <div className="w-24 h-24 rounded-xl bg-canvas border border-slate-border text-text-heading flex items-end p-2 text-xs font-medium shadow-sm">Canvas</div>
            <div className="w-24 h-24 rounded-xl bg-tint border border-slate-border text-text-heading flex items-end p-2 text-xs font-medium shadow-sm">Tint</div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="w-24 h-24 rounded-xl bg-status-active-bg text-status-active flex items-end p-2 text-xs font-medium shadow-sm">Success</div>
            <div className="w-24 h-24 rounded-xl bg-status-warning-bg text-status-warning flex items-end p-2 text-xs font-medium shadow-sm">Warning</div>
            <div className="w-24 h-24 rounded-xl bg-status-danger-bg text-status-danger flex items-end p-2 text-xs font-medium shadow-sm">Danger</div>
            <div className="w-24 h-24 rounded-xl bg-status-standby-bg text-status-standby flex items-end p-2 text-xs font-medium shadow-sm">Info</div>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-heading border-b border-slate-border pb-2">Typography</h2>
          <div className="space-y-4 bg-surface p-6 rounded-xl border border-slate-border">
            <h1 className="text-4xl font-bold text-text-heading">Heading 1</h1>
            <h2 className="text-3xl font-semibold text-text-heading">Heading 2</h2>
            <h3 className="text-2xl font-semibold text-text-heading">Heading 3</h3>
            <p className="text-base text-text-body">
              This is standard body text. It should have high readability against both light and dark backgrounds.
            </p>
            <p className="text-sm text-text-muted">
              This is muted text, used for helper text, timestamps, and secondary information.
            </p>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-heading border-b border-slate-border pb-2">Buttons</h2>
          <div className="bg-surface p-6 rounded-xl border border-slate-border flex flex-wrap gap-4 items-center">
            <Button variant="primary">Primary</Button>
            <Button variant="dark">Dark / Approve</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </section>

        {/* Forms */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-heading border-b border-slate-border pb-2">Form Elements</h2>
          <div className="bg-surface p-6 rounded-xl border border-slate-border space-y-4">
            <Input label="Standard Input" placeholder="Type here..." />
            <Select label="Standard Select">
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
            </Select>
            <Input label="Disabled Input" value="Cannot edit me" disabled />
          </div>
        </section>

        {/* Cards & Tables */}
        <section className="space-y-4 xl:col-span-2">
          <h2 className="text-xl font-semibold text-text-heading border-b border-slate-border pb-2">Cards & Tables</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Stable Card Example</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-body">
                    Hovering over this card should NOT cause it to float or change shadow sizes. 
                    It should remain completely stable, matching the dashboard style.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="secondary" className="w-full">Action</Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-surface rounded-xl border border-slate-border p-4">
                <h3 className="font-semibold text-text-heading mb-4">Stable Table Example</h3>
                <DataTable
                  data={dummyData}
                  columns={columns}
                  keyField="id"
                />
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
