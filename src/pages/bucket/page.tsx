import BucketsContentsList from "@/components/buckets/contents-list";
import { useLocation, useParams } from "react-router-dom";
const BucketPage = () => {
    const location = useLocation();
    const params = useParams();
    const currentPath = location.pathname.split('/').slice(3).join('/');
    return (
        <BucketsContentsList bucketName={params.bucketName || ''} path={currentPath} />
    )
}

export default BucketPage;