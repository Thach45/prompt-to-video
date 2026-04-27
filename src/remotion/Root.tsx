import { Composition, registerRoot } from "remotion";
import { ShortVideoTemplate } from "../template/ShareNews";
import { TemplateTechnical } from "../template/TemplateTechnical";
import { defaultVideoSpec } from "../lib/video-spec";

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShareNews"
        component={ShortVideoTemplate}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultVideoSpec as any}
      />
      <Composition
        id="Technical"
        component={TemplateTechnical}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultVideoSpec as any}
      />
    </>
  );
};

registerRoot(RemotionRoot);
