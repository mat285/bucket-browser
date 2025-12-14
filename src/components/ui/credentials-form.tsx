import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { clearCredentials, getCredentials, setCredentials } from "@/state/credentials"
import { useState } from "react"

export interface CredentialsFormProps extends React.ComponentProps<"div"> {
    className?: string;
}
export function CredentialsForm({ className, ...props }: CredentialsFormProps) {
    const credentials = getCredentials();
    const [accessKeyId, setAccessKeyId] = useState(credentials?.accessKeyId || "");
    const [secretAccessKey, setSecretAccessKey] = useState(credentials?.secretAccessKey || "");
    const handleSubmit = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!accessKeyId || !secretAccessKey) {
            alert("Please enter both Access Key ID and Secret Access Key");
            return;
        }
        setCredentials({ accessKeyId, secretAccessKey })
        alert('credentials updated!')
        // await submit({ accessKeyId, secretAccessKey });
    }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Object Storage Credentials</CardTitle>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Access Key ID</FieldLabel>
                <Input
                  id="access-key-id"
                  type="text"
                  placeholder="Enter your Access Key ID"
                  required
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Secret Access Key</FieldLabel>
                </div>
                <Input id="secret-access-key" type="password" placeholder="Enter your Secret Access Key" required value={secretAccessKey} onChange={(e) => setSecretAccessKey(e.target.value)} />
              </Field>
              <Field>
                <Button className="bg-secondary" variant="outline" type="button" onClick={(e) => {
                  e.preventDefault();
                  setAccessKeyId('');
                  setSecretAccessKey('');
                  clearCredentials();
                }}>Clear</Button>
                <Button className="bg-primary" variant="outline" type="button" onClick={handleSubmit}>Save</Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
