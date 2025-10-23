"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const SparklesCore = ({
  id,
  background,
  minSize,
  maxSize,
  particleDensity,
  className,
  particleColor,
}: {
  id: string;
  background: string;
  minSize: number;
  maxSize: number;
  particleDensity: number;
  className?: string;
  particleColor: string;
}) => {
  return (
    <div
      className={cn(
        "w-full h-full absolute inset-0",
        className
      )}
      style={{
        background,
      }}
    >
      <div className="w-full h-full relative">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 20% 50%, ${particleColor} 0%, transparent 50%),
                         radial-gradient(circle at 80% 20%, ${particleColor} 0%, transparent 50%),
                         radial-gradient(circle at 40% 80%, ${particleColor} 0%, transparent 50%)`,
            opacity: 0.1,
          }}
        />
      </div>
    </div>
  );
};
