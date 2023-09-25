import { Duration, Stack, StackProps, aws_events_targets } from "aws-cdk-lib";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

export class TiakiEventBridgeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create the LayerVersion
    const myLayer = new LayerVersion(this, "MyLayer", {
      code: Code.fromAsset("./zip/nodejs.zip"),
      compatibleRuntimes: [Runtime.NODEJS_18_X],
      description: "My custom layer",
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      runtime: Runtime.NODEJS_18_X,
    };

    const tiakiLambda = new NodejsFunction(this, "tiakiLambdaFunction", {
      handler: "index.handler",
      entry: join(__dirname, `../handlers/handler.ts`),
      ...nodeJsFunctionProps,
      timeout: Duration.seconds(60),
    });

    tiakiLambda.addLayers(myLayer);

    const eventBus = new EventBus(this, "TiakiEventBus", {
      eventBusName: "TiakiEventBus",
    });
    // create event rule
    const eventRule = new Rule(this, `TiakiEventRule`, {
      enabled: true,
      eventBus: eventBus,
      description: `works when event is received here with pattern defined`,
      eventPattern: {
        source: ["com.eventBridge.trigger"],
        detailType: ["tiaki-trigger"],
      },
    });

    eventRule.addTarget(new aws_events_targets.LambdaFunction(tiakiLambda));

    eventBus.grantPutEventsTo(tiakiLambda);
  }
}
