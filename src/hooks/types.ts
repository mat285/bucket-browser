export interface Bucket {
    name: string;
    creationDate?: string;
    size?: number;
    objectCount?: number;
}

export interface Object {
    name: string;
    key?: string;
    size?: number;
    lastModified?: string;
    type?: string;
    isDirectory?: boolean;
}

export interface ListObjectsResponse {
    objects: Object[];
    continuationToken?: string;
}