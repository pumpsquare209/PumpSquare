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
        <div className="grid lg:grid-cols-[0.48fr_0.52fr] gap-6 lg:gap-8 items-center">
          <Reveal delay={120} className="relative order-2 lg:order-1">
            <div className="relative w-full h-[360px] lg:h-[420px] transform-gpu md:-translate-x-3 md:-translate-y-2 lg:-translate-x-5 lg:-translate-y-4">
              <Pump3DViewerWrapper
                showLabels={false}
                autoRotateSpeed={0.8}
              />
            </div>
          </Reveal>

          <Reveal className="order-1 lg:order-2">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-1 w-10 rounded-full bg-accent flex-shrink-0" />
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-primary">
                CAPABILITIES
              </p>
            </div>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-[1.15] tracking-tight text-primary-deep max-w-[520px]">
              Advanced Pumping Equipment
            </h2>
            <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-accent" />
            <p className="mt-5 text-base sm:text-lg leading-[1.7] text-ink max-w-[520px]">
              We deliver reliable performance through our standard and engineered pumps, serving diverse industries and supporting customer satisfaction.
            </p>
            <div className="mt-7">
              <ButtonLink
                href="/contact"
                variant="primary"
                className="px-6 py-3 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
              >
                Request a Quote
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.5} />
              </ButtonLink>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 lg:mt-14 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal key={index} delay={index * 80} as="article" className="relative">
                  <div className="flex gap-3 lg:gap-4">
                    <span className="flex-shrink-0 mt-0.5 grid size-10 place-items-center rounded-lg bg-primary-soft">
                      <Icon aria-hidden="true" className="size-5 text-primary-dark" strokeWidth={1.8} />
                    </span>
                    <p className="text-sm sm:text-base leading-relaxed text-primary-deep font-medium">
                      {feature.text}
                    </p>
                  </div>
                  {index < features.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-[55%] bg-primary/15"
                    />
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}