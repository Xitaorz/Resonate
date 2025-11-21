import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SignupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  email: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  error?: string | null;
};

export default function SignupDialog({
  open,
  onOpenChange,
  username,
  email,
  password,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading,
  error,
}: SignupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign up</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="Username"
            autoFocus
          />
          <Input
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Email"
            type="email"
          />
          <Input
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Password"
            type="password"
          />
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
        </div>
        <DialogFooter className="flex gap-2">
          <Button onClick={onSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? "Signing up…" : "Sign up"}
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
