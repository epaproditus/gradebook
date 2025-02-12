export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-lg bg-white ${className}`}>{children}</div>
  );
  
  export const Button = ({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button onClick={onClick} className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${className}`}>
      {children}
    </button>
  );