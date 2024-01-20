
import { useNuxtApp, useRuntimeConfig, createError  } from "#imports";
import type { S3AuthHeaders, S3Error, S3ObjectMetadata } from "./types/useS3EdgeTypes";
import { withoutTrailingSlash, parseURL, joinURL } from 'ufo';
import { v4 as uuidv4 } from 'uuid';


abstract class S3Abstraction {
  abstract create(
    file: File,
    key: string,
    meta?: S3ObjectMetadata
  ): Promise<string>;
  abstract update(
    url: string,
    file: File,
    key: string,
    meta?: S3ObjectMetadata
  ): Promise<string>;
  abstract remove(url: string): Promise<void>;
  abstract upload(
    file: File,
    opts?: {
      url?: string;
      key?: string;
      prefix?: string;
      meta?: S3ObjectMetadata;
    }
  ): Promise<string>;
  abstract getURL(key: string): string;
  abstract getKey(url: string): string | undefined;
  abstract isValidURL(url: string): boolean;
  abstract verifyType(type: string): void;
  abstract verifySize(size: number): void;
}


class EdgeS3Service extends S3Abstraction {
    async create(file: File, key: string, meta?: S3ObjectMetadata): Promise<string> {
        const formData = new FormData();
    
        formData.append('file', file);
    
        if (typeof meta === 'object') {
          formData.append('meta', JSON.stringify(meta));
        }
    
        const headers: S3AuthHeaders = { authorization: '' };
        // @ts-ignore
        await useNuxtApp().callHook('s3:auth', headers);
    
        const fetchOptions = {
          method: 'POST',
          body: formData,
          headers,
          credentials: 'omit' as 'omit',
        };
    
        // @ts-ignore
        await $fetch(`/api/s3/mutation/${key}`, fetchOptions);
    
        return this.getURL(key);
      }
    
      async update(url: string, file: File, key: string, meta?: S3ObjectMetadata): Promise<string> {
        const headers: S3AuthHeaders = { authorization: '' };
    
        // @ts-ignore
        await useNuxtApp().callHook('s3:auth', headers);
    
        await this.remove(url).catch(() => { });
    
        // @ts-ignore
        await useNuxtApp().callHook('s3:auth', headers);
    
        return this.create(file, key, meta);
      }
    
      async remove(url: string): Promise<void> {
        if (!this.isValidURL(url)) {
          return;
        }
    
        const key = this.getKey(url);
    
        const headers: S3AuthHeaders = { authorization: '' };
        // @ts-ignore
        await useNuxtApp().callHook('s3:auth', headers);
    
        const fetchOptions = {
          method: 'DELETE',
          headers,
          credentials: 'omit' as 'omit',
        };
        // @ts-ignore
        await $fetch(`/api/s3/mutation/${key}`, fetchOptions);
      }
    
      async upload(file: File, opts?: { url?: string; key?: string; prefix?: string, meta?: S3ObjectMetadata }): Promise<string> {
        this.verifyType(file.type);
        this.verifySize(file.size);
    
        const ext = file.name.split('.').pop();
    
        const prefix = opts?.prefix ? opts.prefix.replace(/^\//, '') : '';
    
        const _key = `${opts?.key ?? prefix + uuidv4()}.${ext}`;
    
        if (opts?.url) {
          if (this.isValidURL(opts.url)) {
            return this.update(opts.url, file, _key, opts.meta);
          }
        }
    
        return this.create(file, _key, opts?.meta);
      }
    
      getURL(key: string): string {
        return joinURL('/api/s3/query/', key);
      }
    
      getKey(url: string): string | undefined {
        const pathname = withoutTrailingSlash(parseURL(url).pathname);
        const regex = /^\/api\/s3\/query\//;
        if (regex.test(pathname)) {
          return pathname.replace(regex, '');
        }
      }
    
      isValidURL(url: string): boolean {
        return typeof this.getKey(url) !== 'undefined';
      }
    
      verifyType(type: string): void {
        // @ts-ignore
        const regex: RegExp = new RegExp(useRuntimeConfig().public.s3.accept);

        if (!regex.test(type)) {
          throw createError('invalid-type') as S3Error;
        }
      }

      verifySize(size: number): void {
        // @ts-ignore
        const maxSizeMb = useRuntimeConfig().public.s3.maxSizeMb;
        if (maxSizeMb && size > maxSizeMb * 1000000) {
          throw createError('invalid-size') as S3Error;
        }
      }
}

export default new EdgeS3Service();
