import { TemplateId } from "@/lib/types";

import {
  ModernElegantLabTemplateData,
  TemplateInputSeed,
} from "./types";

function fallback(value: string, replacement: string): string {
  return value.trim() || replacement;
}

export function getDefaultModernElegantTemplateData(
  seed: TemplateInputSeed,
): ModernElegantLabTemplateData {
  const labName = fallback(seed.labName, "Precision Diagnostics Lab");
  const headline = fallback(
    seed.headline,
    "Precision testing for confident clinical decisions.",
  );
  const description = fallback(
    seed.description,
    "We provide high-quality, rapid laboratory testing with strict quality controls and compassionate patient support.",
  );

  return {
    heroTitle: `${labName}`,
    heroSubtitle: headline,
    introBlurb: description,
    primaryCtaText: "Book a consultation",
    primaryCtaHref: "#contact",
    services: [
      {
        title: "Clinical Chemistry",
        description:
          "Comprehensive blood and metabolic panels with rapid turnaround.",
      },
      {
        title: "Molecular Diagnostics",
        description:
          "Advanced PCR and genomic-based testing for accurate detection.",
      },
      {
        title: "Pathology Support",
        description:
          "Integrated pathology workflows and specialist interpretation support.",
      },
    ],
    stats: [
      { label: "Tests Processed / Month", value: "28,000+" },
      { label: "Average Report Turnaround", value: "12 hrs" },
      { label: "Quality Assurance Score", value: "99.7%" },
    ],
    processSteps: [
      "Sample collection and chain-of-custody registration.",
      "Automated analysis with internal quality checkpoints.",
      "Specialist review and clinical validation.",
      "Secure digital reporting to providers and patients.",
    ],
    certifications: [
      "ISO 15189-aligned workflows",
      "CAP-ready quality protocols",
      "HIPAA-conscious data handling",
    ],
    researchAreas: [
      "Infectious Disease Biomarkers",
      "Molecular Oncology Panels",
      "Precision Diagnostics AI Workflows",
    ],
    testimonials: [
      {
        quote:
          "Their turnaround speed and consistency improved our care pathway significantly.",
        author: "Dr. Leena Kapoor",
        role: "Medical Director",
      },
      {
        quote:
          "Clear reporting and responsive support make this lab an ideal partner.",
        author: "Arjun Menon",
        role: "Operations Lead, Health Network",
      },
    ],
    contact: {
      email: fallback(seed.contactEmail, "contact@labsite.com"),
      phone: "+1 (555) 010-2020",
      address: "1200 Science Park Blvd, Suite 220",
      hours: "Mon-Fri, 7:00 AM - 8:00 PM",
    },
  };
}

export function getDefaultTemplateData(
  templateId: string,
  seed: TemplateInputSeed,
): Record<string, unknown> {
  if (templateId === "modern-elegant-lab") {
    return getDefaultModernElegantTemplateData(seed);
  }

  return getDefaultModernElegantTemplateData(seed);
}

export function isModernTemplate(templateId: TemplateId | string): boolean {
  return templateId === "modern-elegant-lab";
}
