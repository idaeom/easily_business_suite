
process.env.APP_MODE = "TEST";
import { OtpService } from "../lib/otp";

async function testOtp() {
    console.log("Testing OTP...");
    const otp = await OtpService.generateOtp("test@example.com");
    console.log("OTP Generated:", otp);
    process.exit(0);
}

testOtp().catch(console.error);
