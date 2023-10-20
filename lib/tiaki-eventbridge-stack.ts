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
      entry: join(__dirname, `../handlers/announceHandler.ts`),
      ...nodeJsFunctionProps,
      timeout: Duration.seconds(60),
    });

    // const freeUsLambdaArn =
    //   "arn:aws:lambda:us-west-2:973019961139:function:freeus-integration";

    // const freeUsLambda = NodejsFunction.fromFunctionArn(
    //   this,
    //   "freeUsLambdaFunction",
    //   freeUsLambdaArn
    // );

    const freeUsLambda = new NodejsFunction(this, "freeUsLambdaFunction", {
      handler: "index.handler",
      entry: join(__dirname, `../handlers/freeUsHandler.ts`),
      ...nodeJsFunctionProps,
      timeout: Duration.seconds(60),
    });

    tiakiLambda.addLayers(myLayer);
    freeUsLambda.addLayers(myLayer);

    const eventBus = new EventBus(this, "TiakiEventBus", {
      eventBusName: "TiakiEventBus",
    });

    // create event rule for announce
    const eventRule = new Rule(this, `TiakiEventRule`, {
      enabled: true,
      eventBus: eventBus,
      description: `works when event is received here with pattern defined`,
      eventPattern: {
        source: ["com.eventBridge.trigger"],
        detailType: ["tiaki-trigger"],
      },
    });

    // create event rule for free us
    const eventRuleFreeUs = new Rule(this, `FreeUsEventRule`, {
      enabled: true,
      eventBus: eventBus,
      description: `works when event is received here with pattern defined for freeus`,
      eventPattern: {
        source: ["com.eventBridge.trigger"],
        detailType: ["freeus-trigger"],
      },
    });

    eventRule.addTarget(new aws_events_targets.LambdaFunction(tiakiLambda));
    eventRuleFreeUs.addTarget(
      new aws_events_targets.LambdaFunction(freeUsLambda)
    );

    eventBus.grantPutEventsTo(tiakiLambda);
    eventBus.grantPutEventsTo(freeUsLambda);
  }
}
