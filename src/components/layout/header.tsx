import Logo from "@/assets/logo.svg";
const Header = () => {
    return (    
        <div className="h-full w-full flex">
            <div className="h-full w-1/12">
                <a href="/" className="flex items-center gap-2 link">
                    <img src={Logo} alt="Logo" className="w-20 h-30" />
                    <p className="text-3xl font-bold">Bucket Browser</p>
                </a>
            </div>
            <div className="h-full w-10/12 flex items-center justify-center">
            </div>
            <div className="h-full w-1/12 flex items-right">
                <a href="/credentials" className="button">Credentials</a>
            </div>
        </div>
    )
}

export default Header;
