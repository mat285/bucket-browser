import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { useNavigation } from "react-router-dom";
import { useOptionalApiClient } from "@/hooks/api";
import { type Object } from "@/hooks/types";
import { useLocation, useNavigate } from "react-router-dom";

export interface BucketContentsListProps {
    bucketName: string;
    path: string;
}


const BucketsContentsList = ({ bucketName, path }: BucketContentsListProps) => {
    const location = useLocation();
    const client = useOptionalApiClient();
    const navigate = useNavigate();
    const [objects, setObjects] = useState<Object[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [statePath, setStatePath] = useState<string>(path);

    

    const onClick = (object: Object) => {
        if (object.isDirectory) {
            navigate(`/bucket/${bucketName}/${object.key}`);
            const newPath = object.key ?? path;
            if (newPath !== path) {
                setStatePath(newPath);
                setLoading(true);
            }
        } else {
            navigate(`/object/${bucketName}/${object.key}`);
        }
    }

    useEffect(() => {
        const fetchObjects = async () => {
            if (!bucketName) {
                throw new Error('Bucket name not found');
            }
            if (!client) {
                return {objects: [], continuationToken: undefined};
            }
            const objects: Object[] = [];
            let continuationToken: string | undefined = undefined;
            do {
                const response = await client.listObjects(bucketName, statePath, continuationToken);
                objects.push(...response.objects);
                continuationToken = response.continuationToken;
            } while (continuationToken);    
            return objects;
        }
        
        fetchObjects().then((objects) => {
            setObjects(objects as Object[]);
        }).catch((err) => {
            setError(err.message);
            console.error(err.message);
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    if (!bucketName || !location) {
        return <div>Bucket name not found</div>;
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>{bucketName}</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? <div>Loading...</div> : <ObjectsTable objects={objects} onClick={onClick}/>}
                {error && <div className="text-red-500">{error}</div>}
            </CardContent>
        </Card>
    )
}

export interface ObjectsTableProps {
    objects: Object[];
    onClick: (object: Object) => void
}

const ObjectsTable = ({objects, onClick}: ObjectsTableProps) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead>Type</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {objects.map((object) => (
                    <TableRow 
                        key={object.name}
                        onClick={(e) => {
                            e.preventDefault();
                            onClick(object);
                        }}
                    >
                        <TableCell>{object.name}</TableCell>
                        <TableCell>{object.size?? ""}</TableCell>
                        <TableCell>{object.lastModified?? ""}</TableCell>
                        <TableCell>{object.type}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default BucketsContentsList;