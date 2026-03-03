/**
 * A lightweight, pure-CSS mockup of a media-plan calendar/budget UI
 * shown in the hero section of the landing page.
 */
export const HeroMockup = () => {
  const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze'];
  const bars = [
    { label: 'TV Spot Launch', width: '60%', color: 'bg-primary' },
    { label: 'Social media Q1', width: '45%', color: 'bg-status-in-progress' },
    { label: 'OOH Billboard', width: '75%', color: 'bg-status-completed' },
    { label: 'Digital Ads', width: '35%', color: 'bg-primary/60' },
  ];

  return (
    <div className="relative">
      {/* Glow behind */}
      <div className="absolute -inset-4 bg-gradient-to-br from-copper-light/20 to-transparent rounded-3xl blur-2xl" />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-status-in-progress/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-status-completed/60" />
          <span className="ml-3 text-[10px] text-muted-foreground font-medium">CorePlan — Media Plan 2026</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Budget bar */}
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Budżet Q1</span>
              <span className="text-foreground font-semibold">67% wykorzystano</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-copper-light to-copper-dark" />
            </div>
          </div>

          {/* Mini Gantt */}
          <div>
            <div className="grid grid-cols-6 mb-2">
              {months.map((m) => (
                <span key={m} className="text-[10px] text-muted-foreground text-center">{m}</span>
              ))}
            </div>
            <div className="space-y-2">
              {bars.map((bar) => (
                <div key={bar.label} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-24 truncate flex-shrink-0">{bar.label}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div className={`h-full rounded ${bar.color} opacity-80`} style={{ width: bar.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            {[
              { label: 'Aktywności', value: '24' },
              { label: 'Klienci', value: '8' },
              { label: 'Budżet', value: '340k PLN' },
            ].map((s) => (
              <div key={s.label} className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-base font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
