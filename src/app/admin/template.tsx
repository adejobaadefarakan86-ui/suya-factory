// Each admin page fades in gently when you move between them (globals.css .page-fade).
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
