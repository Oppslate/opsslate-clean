export const heliosClerkAppearance = {
  variables: {
    colorPrimary: "var(--color-primary)",
    colorBackground: "var(--color-card)",
    colorInputBackground: "var(--color-background)",
    colorInputText: "var(--color-foreground)",
    colorText: "var(--color-foreground)",
    colorTextSecondary: "var(--color-muted-foreground)",
    colorDanger: "var(--color-destructive)",
    borderRadius: "var(--radius)",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full max-w-md",
    cardBox: "w-full shadow-none",
    card:
      "w-full border border-border bg-card px-6 py-7 shadow-none sm:rounded-xl",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton:
      "border-border bg-background text-foreground hover:bg-muted",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    formFieldLabel: "text-foreground",
    formFieldInput:
      "border-border bg-background text-foreground focus:border-orange-500",
    formButtonPrimary:
      "bg-orange-500 text-white hover:bg-orange-400 focus-visible:ring-orange-400",
    footerActionText: "text-muted-foreground",
    footerActionLink: "text-orange-300 hover:text-orange-200",
    identityPreview: "border-border bg-background",
    identityPreviewText: "text-foreground",
    formFieldErrorText: "text-red-400",
    alertText: "text-foreground",
  },
} as const;
