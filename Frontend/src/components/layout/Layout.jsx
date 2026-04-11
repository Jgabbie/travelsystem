import { Outlet } from "react-router-dom";
import TopNavUser from "../topnav/TopNavUser";

const Layout = () => {
    return (
        <>
            <TopNavUser />
            <main>
                <Outlet />
            </main>
        </>
    );
};

export default Layout;