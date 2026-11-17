import { Skeleton } from "@/components/ui/skeleton";

// Shaped like the login card: a title, two fields and the button.
export default function AuthLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading"
      className="flex flex-col gap-6"
    >
      <Skeleton className="h-7 w-28" delay={150} />
      <div className="flex flex-col gap-5">
        {[0, 1].map((index) => (
          <div className="flex flex-col gap-2" key={index}>
            <Skeleton className="h-4 w-20" delay={150} variant="line" />
            <Skeleton
              className="h-(--field-h) w-full rounded-(--radius-well)"
              delay={150}
            />
          </div>
        ))}
        <Skeleton className="mt-1 h-12 w-full rounded-full" delay={150} />
      </div>
    </section>
  );
}
