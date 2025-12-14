import Header from "@/components/layout/header";
import Body from "@/components/layout/body";

const Layout = ({children}: {children: React.ReactNode}) => {
    return (   
    <div  id="layout" className="h-full w-full">
        <div className="h-1/12 w-full">    
            <Header />
        </div>
        <div className="h-11/12 w-full">
            <Body className="h-full w-full">  
                {children}
            </Body>
        </div>
    </div>
    )
}

export default Layout;