export class OtherController {
  async checkHealth(req, res) {
    res.json({
      health: "OK.",
      message: `Current Version is ${process.env.CURRENT_VERSION}`,
    });
  }
}
