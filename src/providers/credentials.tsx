import { hasCredentials } from "@/state/credentials";
import { useNavigate } from "react-router-dom";

const CredentialsProvider = ({children}: {children: React.ReactNode}) => {
    const navigate = useNavigate();
    const hasCreds = hasCredentials();
    console.log('hasCreds', hasCreds);
    if (!hasCreds) {
        navigate("/login");
    }
    return (
        <>
            {children}
        </>
    )
}

export default CredentialsProvider;