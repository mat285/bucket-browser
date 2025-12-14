import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptionalApiClient } from "@/hooks/api";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import type { Object } from "@/hooks/types";

const ObjectPage = () => {
    const location = useLocation();
    const client = useOptionalApiClient();
    const [object, setObject] = useState<Object | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const bucketName = useParams().bucketName;
    const objectKey = location.pathname.replace(`/object/${bucketName}`, '');

    useEffect(() => {
        const fetchObjectInfo = async () => {
            if (!client || !bucketName || !objectKey) {
                throw new Error('No client found');
            }
            const object = await client.getObjectInfo(bucketName, objectKey);
            return object;
        }
        fetchObjectInfo().then((object) => {
            setObject(object);
        }).catch((err) => {
            setError(err);
            console.error(err);
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    if (!bucketName || !objectKey) {
        return <div>Bucket name or object key not found</div>;
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle>Object</CardTitle>
            </CardHeader>
            <CardContent>
                {loading && (<div><span>loading</span></div>)}
                {!loading && error && (<div><span>error: {error}</span></div>)}
                {!loading && !error && object && (<div><span>object: {JSON.stringify(object)}</span></div>)}
            </CardContent>
        </Card> 
    )
}

export default ObjectPage;