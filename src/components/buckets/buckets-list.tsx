import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {type Bucket} from '@/hooks/types'
import { useNavigate } from 'react-router-dom';
// import { Pagination, PaginationContent, PaginationItem } from '../ui/pagination';

export interface BucketsTableProps {
    buckets: Bucket[];
}

const BucketsTable = (props : BucketsTableProps) => {
    const navigate = useNavigate();
    return (
        <Table>
            <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Objects</TableHead>
                    </TableRow>
            </TableHeader>
            <TableBody>
            {props.buckets.map((bucket: Bucket) => {
                return (
                    <TableRow onClick={(e) => {
                        e.preventDefault();
                        navigate('/bucket/'+bucket.name)
                    }}>
                        <TableCell>{bucket.name}</TableCell>
                        <TableCell>{bucket.size}</TableCell>
                        <TableCell>{bucket.objectCount}</TableCell>
                    </TableRow>
                )
            })}
            </TableBody>
        </Table>
    )
}

export interface BucketListProps {
    buckets: Bucket[];
    pageSize: number | undefined;
}

const BucketsList = (props: BucketListProps) => {
    const pageSize = props.pageSize ?? 100
    const pages: Bucket[][] = []
    props.buckets.forEach( (bucket: Bucket, i: number) => {
        if (i % pageSize === 0) {
            pages.push([]);
        }
        pages.at(pages.length-1)?.push(bucket)
    })

    // const [currentPage, setCurrentPage] = useState<number>(0)

    return (
        <>
                    {pages.map((page: Bucket[]) => {
                        return (
                                <BucketsTable
                                  buckets={page}
                                />

                        )
                    })}
        </>
    )
}

export default BucketsList