import BucketsContentsList from "@/components/buckets/contents-list";
import { useLocation, useParams } from "react-router-dom";
const BucketPage = () => {
    const location = useLocation();
    const { bucketName } = useParams();
    let path = '/' + location.pathname.replace(`/bucket/${bucketName}`, '');
    if (path.startsWith('//')) {
        path = path.substring(1);
    }
    if (path.endsWith('/')) {
        path = path.substring(0, path.length - 1);
    }
    if (!bucketName) {
        return <div>Bucket name not found</div>;
    }
    return (
        <BucketsContentsList bucketName={bucketName} path={path} />
    )
}

export default BucketPage;