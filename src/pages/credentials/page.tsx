import { CredentialsForm } from "@/components/ui/credentials-form"

const CredentialsPage = () => {
  return (
    <div className="flex items-center justify-center h-full w-full">
        <div className="w-1/2 h-full items-center justify-center">
            <CredentialsForm />
        </div>
    </div>
  )
}

export default CredentialsPage