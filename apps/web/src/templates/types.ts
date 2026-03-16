export type TemplateInputSeed = {
  labName: string;
  headline: string;
  description: string;
  contactEmail: string;
};

export type ServiceItem = {
  title: string;
  description: string;
};

export type StatItem = {
  label: string;
  value: string;
};

export type TestimonialItem = {
  quote: string;
  author: string;
  role: string;
};

export type ModernElegantLabTemplateData = {
  heroTitle: string;
  heroSubtitle: string;
  introBlurb: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  services: ServiceItem[];
  stats: StatItem[];
  processSteps: string[];
  certifications: string[];
  researchAreas: string[];
  testimonials: TestimonialItem[];
  contact: {
    email: string;
    phone: string;
    address: string;
    hours: string;
  };
};
