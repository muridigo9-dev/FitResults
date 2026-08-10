import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-2xl border transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border shadow-sm",
        elevated: "bg-card text-card-foreground border-border shadow-md hover:shadow-lg",
        glass: "bg-card/80 backdrop-blur-xl text-card-foreground border-border/50",
        outline: "bg-transparent border-2 border-border hover:border-primary/30",
        ghost: "bg-transparent border-transparent",
        water: "bg-[hsl(200_85%_55%/0.05)] border-[hsl(200_85%_55%/0.2)] hover:border-[hsl(200_85%_55%/0.4)]",
        sleep: "bg-[hsl(260_60%_60%/0.05)] border-[hsl(260_60%_60%/0.2)] hover:border-[hsl(260_60%_60%/0.4)]",
        workout: "bg-[hsl(12_80%_55%/0.05)] border-[hsl(12_80%_55%/0.2)] hover:border-[hsl(12_80%_55%/0.4)]",
        meals: "bg-[hsl(140_60%_45%/0.05)] border-[hsl(140_60%_45%/0.2)] hover:border-[hsl(140_60%_45%/0.4)]",
        bronze: "bg-[hsl(30_60%_50%/0.05)] border-[hsl(30_60%_50%/0.2)]",
        silver: "bg-[hsl(220_10%_65%/0.05)] border-[hsl(220_10%_65%/0.2)]",
        gold: "bg-[hsl(45_90%_55%/0.05)] border-[hsl(45_90%_55%/0.2)]",
        platinum: "bg-[hsl(200_20%_75%/0.05)] border-[hsl(200_20%_75%/0.2)]",
        diamond: "bg-[hsl(190_80%_60%/0.05)] border-[hsl(190_80%_60%/0.2)]",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-md active:scale-[0.99]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
