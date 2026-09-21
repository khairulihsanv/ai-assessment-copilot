"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Users, Key, Copy, Check, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ClassCardProps {
  id: string;
  name: string;
  subject?: string | null;
  description?: string | null;
  enrollmentKey?: string;
  studentCount?: number;
  dosenName?: string;
  isDosen: boolean;
}

export function ClassCard({
  id,
  name,
  subject,
  description,
  enrollmentKey,
  studentCount = 0,
  dosenName,
  isDosen,
}: ClassCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyKey = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!enrollmentKey) return;
    navigator.clipboard.writeText(enrollmentKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="group relative overflow-hidden border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-accent" />

      <CardHeader className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="text-xs font-medium text-primary border-primary/30 bg-primary/5">
            {subject || "Mata Kuliah"}
          </Badge>
          {isDosen && enrollmentKey && (
            <button
              onClick={handleCopyKey}
              type="button"
              title="Salin Kode Kelas"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border/80"
            >
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{enrollmentKey}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
              )}
            </button>
          )}
        </div>
        <CardTitle className="text-xl font-bold mt-2 font-display line-clamp-1 group-hover:text-primary transition-colors">
          <Link href={`/classes/${id}`} className="focus:outline-none">
            {name}
          </Link>
        </CardTitle>
        {description && (
          <CardDescription className="line-clamp-2 text-sm text-muted-foreground mt-1">
            {description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {isDosen ? (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              <span>{studentCount} Mahasiswa</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-accent" />
              <span>Dosen: {dosenName || "Pengajar"}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 border-t border-border/40 py-3 bg-muted/20 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Buka Kelas</span>
        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 group-hover:translate-x-1 transition-transform">
          <Link href={`/classes/${id}`}>
            <ChevronRight className="w-4 h-4 text-foreground" />
            <span className="sr-only">Buka kelas</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
