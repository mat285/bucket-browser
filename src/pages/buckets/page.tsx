import BucketsList from "@/components/buckets/buckets-list";
import { optionalApiClient } from '@/hooks/api';
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Bucket } from '@/hooks/types';

const Buckets = () => {
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const client = optionalApiClient();

    const fetchBuckets = async (): Promise<Bucket[]> => {
        if (!client) {
            return [];
        }
        return await client.listBuckets().then((buckets) => {
            return buckets as Bucket[];
        });
    }

    useEffect(() => {
        fetchBuckets().
            then((res) => {
                const parsed = res as Bucket[];
                if (!parsed) {
                    throw new Error('unknown response');
                }
                setBuckets(parsed)
            }).
            catch((err) => {
                console.log(err)
            }).
            finally(() => {
                setLoading(false);
            })
    }, [])

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Buckets
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading && (<div><span>loading</span></div>)}
                {!loading && !buckets && (<div><span>No buckets found</span></div>)}
                {!loading && buckets && (<BucketsList buckets={buckets} pageSize={100} />)}
            </CardContent>
        </Card>
    )
}

const Page = () => {
    return (
        <Buckets />
    )
}

export default Page;