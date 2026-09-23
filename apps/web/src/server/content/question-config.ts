import {mapExperienceIds,mapInteractionIds,type MapExperience,type MapInteraction} from "@/features/questions/experience";

const supportedTools=new Set(["buffer","overlay","distance"]);
const supportedExperiences=new Set<string>(mapExperienceIds);
const supportedInteractions=new Set<string>(mapInteractionIds);

export function questionActivityConfigFromForm(form:FormData){
  const stimulus=String(form.get("stimulusType")??"text");
  if(stimulus!=="webgis")return {};

  const tools=form.getAll("allowedGisTool").map(String).filter((tool)=>supportedTools.has(tool));
  const required=form.getAll("requiredGisTool").map(String).filter((tool)=>supportedTools.has(tool)&&tools.includes(tool));
  const distance=Number(form.get("bufferDistance")??500);
  const distanceMeters=Number.isFinite(distance)&&distance>0?Math.min(distance,100000):500;
  const rawExperience=String(form.get("mapExperience")??"standard");
  const mapExperience=(supportedExperiences.has(rawExperience)?rawExperience:"standard") as MapExperience;
  const interactions=form.getAll("mapInteraction").map(String).filter((item)=>supportedInteractions.has(item)) as MapInteraction[];

  return {
    mapExperience,
    interactions:Array.from(new Set(interactions)),
    tools:Array.from(new Set(tools)),
    requiredActions:Array.from(new Set(required)).map((tool)=>({tool,parameters:tool==="buffer"?{distanceMeters}:{}})),
    toolParameters:tools.includes("buffer")?{buffer:{distanceMeters}}:{},
  };
}
