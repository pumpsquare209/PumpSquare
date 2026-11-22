import Pump3DViewerWrapper from "@/components/three/Pump3DViewerWrapper";
import { Wrench, Gauge, ClipboardCheck, ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import ButtonLink from "@/components/ui/ButtonLink";

const features = [
  { icon: Wrench, text: "Quick inspection and easy on-site maintenance without dismantling the assembly." },
  { icon: Gauge, text: "Optimized rotor design for smooth operation, reduced internal losses and excellent suction." },
  { icon: ClipboardCheck, text: "Every pump is tested to ensure it meets the required performance standards before approval." },
] as const;

export default function EquipmentSection() {
  return (
    <section
      aria-label="Advanced Pumping Equipment"
      className="relative isolate overflow-hidden bg-white"
    >
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
      />

      <div className="relative mx-auto w-full max-w-[1450px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* Centered heading group */}
        <div className="max-w-3xl mx-auto text-center">
          <Reveal className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-1 w-10 rounded-full bg-accent flex-shrink-0" />
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-primary">
              CAPABILITIES
            </p>
          </Reveal>
          <Reveal delay={80} className="mt-3">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-[1.15] tracking-tight text-primary-deep">
              Advanced Pumping Equipment
            </h2>
          </Reveal>
          <Reveal delay={160} className="mt-3">
            <span aria-hidden="true" className="block h-1 w-16 rounded-full bg-accent mx-auto" />
          </Reveal>
          <Reveal delay={240} className="mt-5 text-base sm:text-lg leading-[1.7] text-ink max-w-2xl mx-auto">
            We deliver reliable performance through our standard and engineered pumps, serving diverse industries and supporting customer satisfaction.
          </Reveal>
        </div>

        {/* Two-column layout */}
        <div className="mt-14 lg:mt-16 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left column: 3D Pump Model */}
            <Reveal delay={120} className="relative">
              <Pump3DViewerWrapper
                showLabels={false}
                autoRotateSpeed={0.8}
                // @ts-expect-error - dynamic component props not fully inferred
                className="rounded-[24px] border border-line bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
              />
            </Reveal>

            {/* Right column: Vertical feature points + CTA */}
            <Reveal className="flex flex-col gap-6 lg:gap-8 pt-2 lg:pt-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex gap-3 lg:gap-4">
                    <span className="flex-shrink-0 mt-1 grid size-11 place-items-center rounded-lg bg-primary-soft">
                      <Icon aria-hidden="true" className="size-5 text-primary-dark" strokeWidth={1.8} />
                    </span>
                    <p className="text-base lg:text-lg leading-relaxed text-primary-deep font-medium">
                      {feature.text}
                    </p>
                  </div>
                );
              })}

              <Reveal delay={320} className="pt-2 lg:pt-4">
                <ButtonLink
                  href="/contact"
                  variant="primary"
                  className="w-fit px-8 py-3.5 transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-base font-semibold"
                >
                  Request a Quote
                  <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
                </ButtonLink>
              </Reveal>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}