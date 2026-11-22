// Wraps every page and is re-created on each navigation, so each page fades in
// gently when you move to it (globals.css .page-fade).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-fade flex flex-1 flex-col">{children}</div>;
}
