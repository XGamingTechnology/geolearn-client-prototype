import {afterEach,describe,expect,it} from "vitest";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {detectMediaMime,validateMediaBytes} from "./validation";
import {isLegacyMediaUrl,LocalMediaStorage,mediaDeliveryUrl} from "./storage";

const jpeg=new Uint8Array([0xff,0xd8,0xff]);
const png=new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
const webp=new Uint8Array([...Buffer.from("RIFF"),0,0,0,0,...Buffer.from("WEBP")]);
const mp4=new Uint8Array([0,0,0,20,...Buffer.from("ftyp"),0,0,0,0]);
describe("media upload validation",()=>{
  afterEach(()=>{delete process.env.MEDIA_MAX_IMAGE_BYTES;});
  it.each([["JPEG",jpeg,"image/jpeg"],["PNG",png,"image/png"],["WebP",webp,"image/webp"],["MP4",mp4,"video/mp4"]])("accepts %s content",(_name,bytes,mime)=>expect(validateMediaBytes(bytes,mime).mime).toBe(mime));
  it("rejects unsupported or spoofed MIME",()=>{expect(detectMediaMime(new Uint8Array(Buffer.from("<svg>")))).toBeNull();expect(()=>validateMediaBytes(jpeg,"text/html")).toThrow("Format file tidak didukung");});
  it("rejects oversized images with a configurable limit",()=>{process.env.MEDIA_MAX_IMAGE_BYTES="2";expect(()=>validateMediaBytes(jpeg,"image/jpeg")).toThrow("Ukuran file melebihi batas");});
});
describe("media storage security and compatibility",()=>{
  it("makes path traversal impossible",async()=>{const root=await mkdtemp(join(tmpdir(),"media-test-"));const storage=new LocalMediaStorage(root);await expect(storage.open("../../etc/passwd")).rejects.toThrow("Invalid media storage key");await rm(root,{recursive:true,force:true});});
  it("keeps legacy HTTP and app-relative URLs usable",()=>{expect(isLegacyMediaUrl("https://cdn.example/image.jpg")).toBe(true);expect(isLegacyMediaUrl("/legacy/image.png")).toBe(true);expect(mediaDeliveryUrl("id","http://example.test/video.mp4")).toBe("http://example.test/video.mp4");});
  it("turns internal keys into stable application URLs",()=>expect(mediaDeliveryUrl("asset-1","media/123e4567-e89b-42d3-a456-426614174000.png")).toBe("/api/media/asset-1"));
});
