export const clerkAppearance = {
  variables: {
    colorPrimary: "#1a8a8a",
    colorText: "#0d2340",
    colorTextSecondary: "#5a6a7a",
    colorBackground: "#ffffff",
    colorInputBackground: "#fafaf8",
    colorInputText: "#0d2340",
    borderRadius: "8px",
    fontFamily: "inherit",
    fontSize: "14px",
  },
  elements: {
    card: {
      boxShadow: "none",
      border: "1px solid #d4d0c8",
      borderRadius: "12px",
    },
    rootBox: {
      backgroundColor: "#f0efeb",
    },
    headerTitle: {
      color: "#0d2340",
      fontWeight: "600",
    },
    formButtonPrimary: {
      backgroundColor: "#1a8a8a",
      "&:hover": { backgroundColor: "#167676" },
    },
    footerActionLink: {
      color: "#1a8a8a",
      fontWeight: "500",
    },
    socialButtonsBlockButton: {
      border: "1px solid #d4d0c8",
      color: "#0d2340",
      "&:hover": { backgroundColor: "#f0efeb" },
    },
    dividerLine: { backgroundColor: "#d4d0c8" },
    dividerText: { color: "#8a9aaa" },
    formFieldLabel: { color: "#0d2340", fontWeight: "500" },
    formFieldInput: {
      border: "1px solid #d4d0c8",
      "&:focus": {
        borderColor: "#1a8a8a",
        boxShadow: "0 0 0 3px rgba(26,138,138,0.12)",
      },
    },
    logoBox: { justifyContent: "flex-start" },
  },
};