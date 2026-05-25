import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f0efeb",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <SignUp />
    </div>
  );
}
