import {afterEach,describe,expect,it} from "vitest";
import {mediaAccessDecision} from "./access";
import {detectMediaMime,validateMediaBytes} from "./validation";
import {isInternalMediaKey,isLegacyMediaUrl,mediaDeliveryUrl,resolveMediaPath} from "./storage-core";

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
  it("makes path traversal impossible",()=>{expect(()=>resolveMediaPath("/tmp/media-test","../../etc/passwd")).toThrow("Invalid media storage key");});
  it("recognizes internal media keys",()=>{expect(isInternalMediaKey("media/123e4567-e89b-42d3-a456-426614174000.png")).toBe(true);expect(isInternalMediaKey("../bad.png")).toBe(false);});
  it("keeps legacy HTTP and app-relative URLs usable",()=>{expect(isLegacyMediaUrl("https://cdn.example/image.jpg")).toBe(true);expect(isLegacyMediaUrl("/legacy/image.png")).toBe(true);expect(mediaDeliveryUrl("id","http://example.test/video.mp4")).toBe("http://example.test/video.mp4");});
  it("turns internal keys into stable application URLs",()=>expect(mediaDeliveryUrl("asset-1","media/123e4567-e89b-42d3-a456-426614174000.png")).toBe("/api/media/asset-1"));
});

describe("media access decisions",()=>{
  const schoolAsset={scope:"SCHOOL",schoolId:"school-a",ownerTeacherId:"teacher-a"};
  const privateAsset={scope:"PRIVATE",schoolId:"school-a",ownerTeacherId:"teacher-a"};
  it("allows same-school teachers to school media and denies other schools",()=>{
    expect(mediaAccessDecision(schoolAsset,{kind:"teacher",schoolId:"school-a",staffUserId:"teacher-b"})).toBe("ALLOW");
    expect(mediaAccessDecision(schoolAsset,{kind:"teacher",schoolId:"school-b",staffUserId:"teacher-b"})).toBe("DENY");
  });
  it("allows only the owner teacher to private media",()=>{
    expect(mediaAccessDecision(privateAsset,{kind:"teacher",schoolId:"school-a",staffUserId:"teacher-a"})).toBe("ALLOW");
    expect(mediaAccessDecision(privateAsset,{kind:"teacher",schoolId:"school-a",staffUserId:"teacher-b"})).toBe("DENY");
  });
  it("requires an assignment binding before students receive private media",()=>{
    expect(mediaAccessDecision(privateAsset,{kind:"student",schoolId:"school-a"})).toBe("CHECK_STUDENT_BINDING");
    expect(mediaAccessDecision(privateAsset,{kind:"student",schoolId:"school-b"})).toBe("DENY");
  });
  it("allows system media for authenticated actors",()=>{
    expect(mediaAccessDecision({scope:"SYSTEM",schoolId:null,ownerTeacherId:null},{kind:"student",schoolId:"school-a"})).toBe("ALLOW");
  });
});
