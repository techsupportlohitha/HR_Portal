import React, { useMemo, useState } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/Card';
import { Star, MoreHorizontal, ArrowRight, Check, Bookmark, Send, FileText, Phone, Users, Code, Briefcase, UserCheck, CheckCircle } from 'lucide-react';

const COLUMNS = [
  { id: 'REQUIREMENT', title: 'Requirement', icon: FileText, statusText: 'Approved', 
    colors: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-600 dark:border-cyan-400', checkBg: 'bg-transparent text-cyan-600' } },
  { id: 'SOURCING', title: 'Sourcing', icon: Bookmark, statusText: 'Wishlist', 
    colors: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-600 dark:border-blue-400', checkBg: 'bg-transparent text-blue-600' } },
  { id: 'SCREENING', title: 'Screening', icon: Send, statusText: 'Submitted', 
    colors: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-600 dark:border-indigo-400', checkBg: 'bg-indigo-600 text-white' } },
  { id: 'TELEPHONIC', title: 'Telephonic', icon: Phone, statusText: 'In Progress', 
    colors: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-600 dark:border-violet-400', checkBg: 'bg-violet-600 text-white' } },
  { id: 'HR_INTERVIEW', title: 'HR Interview', icon: Users, statusText: 'In Progress', 
    colors: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-600 dark:border-purple-400', checkBg: 'bg-purple-600 text-white' } },
  { id: 'TECHNICAL', title: 'Technical', icon: Code, statusText: 'In Progress', 
    colors: { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-600 dark:text-fuchsia-400', border: 'border-fuchsia-600 dark:border-fuchsia-400', checkBg: 'bg-fuchsia-600 text-white' } },
  { id: 'MANAGEMENT', title: 'Management', icon: Briefcase, statusText: 'In Progress', 
    colors: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-600 dark:border-pink-400', checkBg: 'bg-pink-600 text-white' } },
  { id: 'SELECTED', title: 'Selected', icon: UserCheck, statusText: 'Selected', 
    colors: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-600 dark:border-rose-400', checkBg: 'bg-rose-600 text-white' } },
  { id: 'OFFER', title: 'Offer', icon: Star, statusText: 'Offer Released', 
    colors: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-500 dark:text-orange-400', border: 'border-orange-500 dark:border-orange-400', checkBg: 'bg-orange-500 text-white' } },
  { id: 'JOINED_REJECTED', title: 'Completed', icon: CheckCircle, statusText: 'Closed', 
    colors: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500 dark:border-emerald-400', checkBg: 'bg-emerald-500 text-white' } }
];

export interface KanbanItem {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  originalData?: any;
}

interface KanbanBoardProps {
  items: KanbanItem[];
  onStatusChange: (id: string, newStatus: string) => void;
  onItemClick?: (item: KanbanItem) => void;
}

function SortableItemCard({ item, onClick }: { item: KanbanItem; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 cursor-grab active:cursor-grabbing w-full">
      <Card className="hover:border-slate-300 dark:hover:border-slate-600 transition-colors w-full text-left shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 font-bold text-xs">
                 {item.title.substring(0,2).toUpperCase()}
               </div>
               <div>
                  <div className="font-semibold text-navy-900 dark:text-white text-sm">{item.title}</div>
                  <div className="flex items-center text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.subtitle}
                  </div>
               </div>
             </div>
             <button 
               type="button"
               onPointerDown={(e) => e.stopPropagation()} 
               onClick={onClick}
               className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
             >
               <MoreHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500" />
             </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanColumn({ col, items, onItemClick }: { col: typeof COLUMNS[0]; items: KanbanItem[]; onItemClick?: (item: KanbanItem) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
    data: { type: 'Column' },
  });
  
  const Icon = col.icon;

  return (
    <div className={`flex flex-col rounded-2xl shadow-sm p-4 min-w-[240px] w-[260px] border shrink-0 items-center transition-colors ${
      isOver ? 'bg-surface/80 border-accent-300 dark:border-accent-700' : 'bg-surface border-gray-100 dark:border-gray-800'
    }`}>
      
      {/* Header Row */}
      <div className="flex flex-col items-center justify-center mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${col.colors.bg}`}>
          <Icon className={`w-6 h-6 ${col.colors.text}`} />
        </div>
        <h3 className="font-bold text-base text-navy-900 dark:text-white text-center">{col.title}</h3>
      </div>
      
      {/* Divider */}
      <div className="w-full h-px bg-surface mb-4" />
      
      {/* Items Area */}
      <div ref={setNodeRef} className="flex-1 w-full min-h-[100px] flex flex-col items-center">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(i => (
            <SortableItemCard key={i.id} item={i} onClick={() => onItemClick?.(i)} />
          ))}
          {items.length === 0 && (
            <div className={`text-xs italic py-6 border-2 border-dashed rounded-xl w-full text-center transition-colors ${
              isOver ? 'border-accent-300 text-accent-500 bg-accent-50' : 'border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500'
            }`}>
              Drop here
            </div>
          )}
        </SortableContext>
      </div>

      {/* Footer Status Marker */}
      <div className="mt-4 flex items-center justify-between w-full">
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${col.colors.bg} ${col.colors.text}`}>
          • {col.statusText}
        </div>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${col.colors.border} ${col.colors.checkBg}`}>
          <Check className="w-3 h-3 stroke-[3]" />
        </div>
      </div>
    </div>
  );
}

export function KanbanBoard({ items, onStatusChange, onItemClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const getColumnForItem = (i: KanbanItem) => {
    const colIds = COLUMNS.map(c => c.id);
    if (colIds.includes(i.status)) return i.status;
    return 'REQUIREMENT';
  };

  const columnsData = useMemo(() => {
    const cols: Record<string, KanbanItem[]> = {};
    COLUMNS.forEach(c => cols[c.id] = []);
    
    items.forEach(i => {
      const colId = getColumnForItem(i);
      if (cols[colId]) cols[colId].push(i);
      else cols['REQUIREMENT'].push(i);
    });
    return cols;
  }, [items]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    
    const item = items.find(i => i.id === activeIdStr);
    if (!item) return;

    const columnIds = COLUMNS.map(c => c.id);
    const currentColumn = getColumnForItem(item);
    const currentIndex = columnIds.indexOf(currentColumn);
    let newColumn = currentColumn;

    if (columnIds.includes(overIdStr)) {
      newColumn = overIdStr;
    } else {
      const overItem = items.find(i => i.id === overIdStr);
      if (overItem) {
        newColumn = getColumnForItem(overItem);
      }
    }

    const newIndex = columnIds.indexOf(newColumn);
    
    // Only allow moving forwards
    if (newIndex > currentIndex) {
      onStatusChange(activeIdStr, newColumn);
    }
  };

  const activeItem = activeId ? items.find(i => i.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar items-start">
        {COLUMNS.map((col, index) => (
          <React.Fragment key={col.id}>
            <KanbanColumn col={col} items={columnsData[col.id]} onItemClick={onItemClick} />
            {index < COLUMNS.length - 1 && (
              <div className="flex items-center justify-center h-[200px] px-2 text-violet-300 dark:text-violet-900">
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="w-[250px] opacity-90 cursor-grabbing">
            <SortableItemCard item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}




