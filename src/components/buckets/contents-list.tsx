import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { optionalApiClient } from "@/hooks/api";
import { type Object } from "@/hooks/types";
import { Spinner } from "../ui/spinner";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../ui/pagination";

export interface BucketContentsListProps {
    bucketName: string;
    path: string;
}


const BucketsContentsList = ({ bucketName, path }: BucketContentsListProps) => {
    const [objects, setObjects] = useState<Object[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    

    const onClick = async (object: Object) => {
        const redirectPath = object.isDirectory ? `/bucket/${bucketName}/${object.key}` : `/object/${bucketName}/${object.key}/`;
        // window.location.replace(redirectPath);
        window.location.href = redirectPath;
    }

    const PAGE_SIZE = 20;

    const fetchObjects = async () => {
        if (!bucketName) {
            throw new Error('Bucket name not found');
        }
        const client = optionalApiClient();
        if (!client) {
            throw new Error('Client not found');
        }
        if (loading) {
            return;
        }
        setLoading(true);

        try {
            const response = await client.listObjects(bucketName, path);
            setObjects(response.objects);
        } catch (err) {
            setError(`Error listing objects: ${err}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchObjects();
    }, []);

    if (!bucketName || !location) {
        return <div>Bucket name not found</div>;
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>{`${bucketName}/${path}`}</CardTitle>
            </CardHeader>
            <CardContent>
                {loading && (<Spinner className="size-4 animate-spin items-center justify-center"/>)}
                {!loading && objects &&  (
                <ObjectsPage objects={objects} onClick={onClick} initialPageNumber={0} pageSize={PAGE_SIZE}/>
                )}
                {!loading && error && <div className="text-red-500">{error}</div>}

            </CardContent>
        </Card>
    )
}

export interface ObjectsPageProps {
    objects: Object[];
    onClick: (object: Object) => void
    initialPageNumber?: number
    pageSize?: number
}

const ObjectsPage = ({objects, onClick, initialPageNumber, pageSize}: ObjectsPageProps) => {
    pageSize = pageSize ?? 100;
    const [pageNumber, setPageNumber] = useState<number>(initialPageNumber ?? 0);

    const pageObjects = objects.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);

    return (
        <>
        <ObjectsTable objects={pageObjects} onClick={onClick}/>
        <PaginationComponent pageNumber={pageNumber} pageCount={Math.ceil(objects.length / pageSize)} setPageNumber={setPageNumber} />
        </>
    )
}

const PaginationComponent = ({pageNumber, pageCount, setPageNumber}: {pageNumber: number, pageCount: number, setPageNumber: (pageNumber: number) => void}) => {
    let pageNumbers: number[] = [];
    if (pageNumber == 0) {
        pageNumbers.push(0, 1, 2);
    } else if (pageNumber == pageCount - 1) {
        pageNumbers.push(pageCount - 3, pageCount - 2, pageCount - 1);
    } else {
        pageNumbers.push(pageNumber - 1, pageNumber, pageNumber + 1);
    }

    pageNumbers = pageNumbers.filter((pageNumber) => pageNumber < pageCount && pageNumber >= 0);

    const onClickPrevious = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (pageNumber > 0) {
            setPageNumber(pageNumber - 1);
        } else {
            setPageNumber(0);
        }
    }
    const onClickNext = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (pageNumber < pageCount - 1) {
            setPageNumber(pageNumber + 1);
        } else {
            setPageNumber(pageCount - 1);
        }
    }
    
    const onClickPage = (e: React.MouseEvent<HTMLAnchorElement>, pageNumber: number) => {
        e.preventDefault();
        setPageNumber(pageNumber);
    }
    return (
        <Pagination>
            <PaginationContent>
                <PaginationPrevious type="button" onClick={(e) => onClickPrevious(e)} />
                {pageNumbers.map((pageIndex: number) => (
                    <PaginationItem key={pageIndex}>
                        <PaginationLink className={pageIndex === pageNumber ? 'bg-primary text-primary-foreground' : ''} href="#" onClick={(e) => onClickPage(e, pageIndex)}>{pageIndex+1}</PaginationLink>
                    </PaginationItem>
                ))}
                <PaginationNext type="button" onClick={(e) => onClickNext(e)} />
            </PaginationContent>
        </Pagination>
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