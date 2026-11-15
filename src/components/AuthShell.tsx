import type { ComponentType, ReactNode } from 'react';

/**
 * The sign-in scene: a mint gradient with soft light, frosted-glass panes drifting behind,
 * and a frosted card for the form. Everything is CSS (no image to download), the text sits on
 * a near-white card so contrast stays high, and the motion stops for people who prefer none.
 */
export function AuthShell({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[#e6f5ee] p-4 sm:p-6">
      {/* Soft light */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="auth-float absolute -left-32 -top-32 size-[30rem] rounded-full bg-primary blur-3xl" />
        <div className="auth-float-slow absolute -bottom-40 right-[5%] size-[34rem] rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute left-[30%] top-[45%] size-80 rounded-full bg-white/80 blur-3xl" />
        <div className="absolute right-[12%] top-[6%] size-56 rounded-full bg-[#7fd0b3]/60 blur-3xl" />

        {/* Frosted glass panes */}
        <div className="auth-float-slow absolute -left-10 top-[14%] size-56 rotate-12 rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-white/70 to-white/5 shadow-[0_20px_50px_rgba(31,111,85,0.18)] backdrop-blur-md sm:size-72" />
        <div className="auth-float absolute -right-8 bottom-[10%] size-64 -rotate-12 rounded-[3rem] border border-white/60 bg-gradient-to-tl from-white/70 to-white/5 shadow-[0_20px_50px_rgba(31,111,85,0.18)] backdrop-blur-md sm:size-80" />
        <div className="auth-float absolute left-[62%] top-[8%] hidden size-28 rotate-45 rounded-3xl border border-white/70 bg-gradient-to-br from-white/80 to-white/10 backdrop-blur-sm sm:block" />
        <div className="auth-float-slow absolute bottom-[14%] left-[10%] hidden size-20 -rotate-12 rounded-2xl border border-white/70 bg-gradient-to-br from-white/80 to-white/10 backdrop-blur-sm sm:block" />
      </div>

      <main className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_10px_50px_rgba(15,42,34,0.15)] supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-accent/20 ring-1 ring-white/60">
            <Icon className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
