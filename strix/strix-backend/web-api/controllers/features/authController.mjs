export class AuthController {
  constructor(authService, utilityService, organizationService) {
    this.authService = authService;
    this.utilityService = utilityService;
  }

  async register(req, res) {
    const { email, password } = req.body;
    const result = await this.authService.registerUser(email, password);
    res.status(result.success ? 201 : 500).json(result);
  }

  async login(req, res) {
    const { email, password } = req.body;
    const result = await this.authService.authenticateUser(email, password);
    res.status(result.success ? 200 : 401).json(result);
  }

  async logout(req, res) {
    const { token } = req.body;
    const result = await this.authService.logoutUser(token);
    const status = result === "User logged out successfully" ? 200 : 500;
    res.status(status).send(result);
  }

  async checkOrganizationAuthority(req, res) {
    const { token, orgID } = req.body;

    if (!token || !orgID) {
      return res
        .status(401)
        .json({ success: false, message: "Missing fields" });
    }

    const validatedToken = await this.authService.checkAccessTokenValidity(
      token
    );
    if (!validatedToken) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const checkAuthority =
      await this.authService.checkUserOrganizationAuthority(
        orgID,
        validatedToken.uid
      );
    if (!checkAuthority) {
      return res.status(200).json({ success: true, message: "No Authority" });
    }

    res.status(200).json({ success: true });
  }
}
