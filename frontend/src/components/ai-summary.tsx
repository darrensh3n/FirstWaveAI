"use client"

import { MapPin, AlertTriangle, Gauge, FileText, HelpCircle, Loader2 } from "lucide-react"

export type SummaryData = {
  location: string | null
  incident: string | null
  priority: string | null
  keyFacts: string[]
  missingInfo: string[]
  isProcessing: boolean
}

interface AISummaryProps {
  data: SummaryData
}

function SummaryField({ 
  icon: Icon, 
  label, 
  value, 
  isLoading 
}: { 
  icon: React.ElementType
  label: string
  value: string | null
  isLoading?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analyzing...</span>
          </div>
        ) : value ? (
          <p className="text-sm text-foreground font-medium">{value}</p>
        ) : (
          <p className="text-sm text-amber-500">?</p>
        )}
      </div>
    </div>
  )
}

function ListField({ 
  icon: Icon, 
  label, 
  items, 
  emptyText,
  isLoading 
}: { 
  icon: React.ElementType
  label: string
  items: string[]
  emptyText: string
  isLoading?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analyzing...</span>
          </div>
        ) : items.length > 0 ? (
          <ul className="space-y-1">
            {items.map((item, index) => (
              <li key={index} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  )
}

export function AISummary({ data }: AISummaryProps) {
  const { location, incident, priority, keyFacts, missingInfo, isProcessing } = data

  return (
    <div className="rounded-xl border border-border bg-card h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-foreground text-sm">AI Summary</h3>
        <p className="text-xs text-muted-foreground">Real-time incident analysis</p>
      </div>

      {/* Summary Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <SummaryField 
          icon={MapPin} 
          label="Location" 
          value={location} 
          isLoading={isProcessing && !location}
        />
        
        <SummaryField 
          icon={AlertTriangle} 
          label="Incident" 
          value={incident}
          isLoading={isProcessing && !incident}
        />
        
        <SummaryField 
          icon={Gauge} 
          label="Priority" 
          value={priority}
          isLoading={isProcessing && !priority}
        />
        
        <div className="border-t border-border pt-4">
          <ListField 
            icon={FileText} 
            label="Key Facts" 
            items={keyFacts}
            emptyText="No facts extracted yet"
            isLoading={isProcessing && keyFacts.length === 0}
          />
        </div>
        
        <div className="border-t border-border pt-4">
          <ListField 
            icon={HelpCircle} 
            label="Missing Info" 
            items={missingInfo}
            emptyText="All information collected"
            isLoading={isProcessing && missingInfo.length === 0}
          />
        </div>
      </div>
    </div>
  )
}
