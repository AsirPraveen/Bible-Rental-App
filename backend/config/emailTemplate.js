const dotenv = require('dotenv');
dotenv.config();

const resetPasswordTemplate = (name, otp, email) => {
    return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                <head>
                <!--[if gte mso 9]>
                <xml>
                <o:OfficeDocumentSettings>
                    <o:AllowPNG/>
                    <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
                </xml>
                <![endif]-->
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="x-apple-disable-message-reformatting">
                <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
                <title></title>
                
                    <style type="text/css">
                    
                    @media only screen and (min-width: 520px) {
                        .u-row {
                        width: 500px !important;
                        }

                        .u-row .u-col {
                        vertical-align: top;
                        }

                        
                            .u-row .u-col-100 {
                            width: 500px !important;
                            }
                        
                    }

                    @media only screen and (max-width: 520px) {
                        .u-row-container {
                        max-width: 100% !important;
                        padding-left: 0px !important;
                        padding-right: 0px !important;
                        }

                        .u-row {
                        width: 100% !important;
                        }

                        .u-row .u-col {
                        display: block !important;
                        width: 100% !important;
                        min-width: 320px !important;
                        max-width: 100% !important;
                        }

                        .u-row .u-col > div {
                        margin: 0 auto;
                        }


                        .u-row .u-col img {
                        max-width: 100% !important;
                        }

                }
                    
                body{margin:0;padding:0}table,td,tr{border-collapse:collapse;vertical-align:top}p{margin:0}.ie-container table,.mso-container table{table-layout:fixed}*{line-height:inherit}a[x-apple-data-detectors=true]{color:inherit!important;text-decoration:none!important}


                table, td { color: #000000; } #u_body a { color: #0000ee; text-decoration: underline; }
                    </style>
                
                

                </head>

                <body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #e7e7e7;color: #000000">
                <!--[if IE]><div class="ie-container"><![endif]-->
                <!--[if mso]><div class="mso-container"><![endif]-->
                <table role="presentation" id="u_body" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #e7e7e7;width:100%" cellpadding="0" cellspacing="0">
                <tbody>
                <tr style="vertical-align: top">
                    <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                    <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: #e7e7e7;"><![endif]-->
                    
                
                
                <div class="u-row-container" style="padding: 0px;background-color: transparent">
                <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                    <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                    <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:500px;"><tr style="background-color: transparent;"><![endif]-->
                    
                <!--[if (mso)|(IE)]><td align="center" width="500" style="width: 500px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
                <div class="u-col u-col-100" style="max-width: 320px;min-width: 500px;display: table-cell;vertical-align: top;">
                <div style="height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
                <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
                
                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="padding-right: 0px;padding-left: 0px;" align="center">
                    
                    <img align="center" border="0" src=${process.env.HEADER_IMAGE} alt="" title="" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 100%;max-width: 480px;" width="480"/>
                    
                    </td>
                </tr>
                </table>

                    </td>
                    </tr>
                </tbody>
                </table>

                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <!--[if mso]><table role="presentation" width="100%"><tr><td><![endif]-->
                    <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-size: 25px; font-weight: 400;"><span><strong>Your OTP</strong></span></h1>
                <!--[if mso]></td></tr></table><![endif]-->

                    </td>
                    </tr>
                </tbody>
                </table>

                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:0px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <table role="presentation" height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                    <tbody>
                    <tr style="vertical-align: top">
                        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                        <span>&#160;</span>
                        </td>
                    </tr>
                    </tbody>
                </table>

                    </td>
                    </tr>
                </tbody>
                </table>

                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <div style="font-size: 14px; line-height: 140%; text-align: left; word-wrap: break-word;">
                    <p style="line-height: 140%;">Hello <strong>${name},  </strong></p>
                <p style="line-height: 140%;"><br />We have received a request to reset the password for your account associated with the email: ${email}.</p><br>
                <p style="line-height: 140%;">Your One-Time Password (OTP) is:</p>
                </div>

                    </td>
                    </tr>
                </tbody>
                </table>

                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <div style="font-size: 45px; line-height: 140%; text-align: center; word-wrap: break-word;">
                    <p style="line-height: 140%;"><strong>${otp}</strong></p>
                </div>

                    </td>
                    </tr>
                </tbody>
                </table>

                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <div style="font-size: 14px; line-height: 140%; text-align: left; word-wrap: break-word;">
                    <p style="line-height: 140%;">Note that the OTP is valid only for 10 minutes.<br /><br /><span style="color: #000000; line-height: 19.6px;">Regards,</span><br /><span style="color: #000000; line-height: 19.6px;"><strong>${process.env.APP_NAME} App Team</strong></span></p>
                </div>

                    </td>
                    </tr>
                </tbody>
                </table>

                <!-- <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="padding-right: 0px;padding-left: 0px;" align="center">
                    
                    <img align="center" border="0" src="https://s3.ca-central-1.amazonaws.com/io.vlinder.gem-prod/logo/tribe_24/TRIBE_Footer_Logo.jpg" alt="" title="" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 75%;max-width: 360px;" width="360"/>
                    
                    </td>
                </tr>
                </table>

                    </td>
                    </tr>
                </tbody>
                </table>
                -->
                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:1px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <table role="presentation" height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                    <tbody>
                    <tr style="vertical-align: top">
                        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                        <span>&#160;</span>
                        </td>
                    </tr>
                    </tbody>
                </table>

                    </td>
                    </tr>
                </tbody>
                </table>

                <!-- <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:5px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <div>
                    <div align="center">
                                                <div style="display: table; max-width:110px;">
                                                <!--[if (mso)|(IE)]><table width="110" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-collapse:collapse;" align="center"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; mso-table-lspace: 0pt;mso-table-rspace: 0pt; width:110px;"><tr><![endif]-->


                                                <!--[if (mso)|(IE)]><td width="32" style="width:32px; padding-right: 5px;" valign="top"><![endif]-->
                <!--                                   <table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width: 32px !important;height: 32px !important;display: inline-block;border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 5px">
                                                    <tbody>
                                                    <tr style="vertical-align: top">
                                                        <td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                                                        <a href="{{facebookUrl}}" title="Facebook" target="_blank">
                                                            <img src="https://cdn.tools.unlayer.com/social/icons/circle/facebook.png" alt="Facebook" title="Facebook" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important">
                                                        </a>
                                                        </td>
                                                    </tr>
                                                    </tbody>
                                                </table> -->
                                                <!--[if (mso)|(IE)]></td><![endif]-->

                                                <!--[if (mso)|(IE)]><td width="32" style="width:32px; padding-right: 5px;" valign="top"><![endif]-->
                <!--                                   <table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width: 32px !important;height: 32px !important;display: inline-block;border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 5px">
                                                    <tbody>
                                                    <tr style="vertical-align: top">
                                                        <td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                                                        <a href="{{twitterUrl}}" title="Twitter" target="_blank">
                                                            <img src="https://cdn.tools.unlayer.com/social/icons/circle/twitter.png" alt="Twitter" title="Twitter" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important">
                                                        </a>
                                                        </td>
                                                    </tr>
                                                    </tbody>
                                                </table> -->
                                                <!--[if (mso)|(IE)]></td><![endif]-->

                                                <!--[if (mso)|(IE)]><td width="32" style="width:32px; padding-right: 0px;" valign="top"><![endif]-->
                <!--                                   <table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width: 32px !important;height: 32px !important;display: inline-block;border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 0px">
                                                    <tbody>
                                                    <tr style="vertical-align: top">
                                                        <td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                                                        <a href="{{instagramUrl}}" title="Instagram" target="_blank">
                                                            <img src="https://cdn.tools.unlayer.com/social/icons/circle/instagram.png" alt="Instagram" title="Instagram" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important">
                                                        </a>
                                                        </td>
                                                    </tr>
                                                    </tbody>
                                                </table> -->
                                                <!--[if (mso)|(IE)]></td><![endif]-->


                                                <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                                                </div>
                                            </div>
                </div>

                    </td>
                    </tr>
                </tbody>
                </table>
                <br>

                <!-- <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <div style="font-size: 15px; line-height: 40%; text-align: center; word-wrap: break-word;">
                    <p style="line-height: 40%;">Carnival Gem</p>
                </div>

                    </td>
                    </tr>
                </tbody>
                </table> -->

                <!-- <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:6px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <div style="font-size: 10px; line-height: 0%; text-align: center; word-wrap: break-word;">
                    <p style="line-height: 0%;">202, Rosalino Street, Woodbrook, Port Of Spain, Trinidad And Tobago</p>
                </div>

                    </td>
                    </tr>
                </tbody>
                </table> -->

                <!-- <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                        
                <div style="font-size: 7px; line-height: 140%; text-align: center; word-wrap: break-word;">
                    <div>
                <div>This is an automated email and doesn't accept any replies. Please get in touch with us on <a rel="noopener" href="mailto:masx@ultimategrouptt.com" target="_blank">masx@ultimategrouptt.com</a> for any queries</div>
                </div>
                </div>

                    </td>
                    </tr>
                </tbody>
                </table> -->

                <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
                </div>
                </div>
                <!--[if (mso)|(IE)]></td><![endif]-->
                    <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                    </div>
                </div>
                </div>
                


                    <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
                    </td>
                </tr>
                </tbody>
                </table>
                <!--[if mso]></div><![endif]-->
                <!--[if IE]></div><![endif]-->
                </body>

                </html>`
}

const bookApprovalTemplate = (name, content) => {
    return commonTemplate("Book Approved", name, content);
};

const bookRejectionTemplate = (name, content) => {
    return commonTemplate("Book Request Rejected", name, content);
};

const commonTemplate = (title, name, content) => {
    return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="x-apple-disable-message-reformatting">
                <title>${title}</title>
                
                    <style type="text/css">
                    @media only screen and (min-width: 520px) { .u-row { width: 500px !important; } .u-row .u-col { vertical-align: top; } .u-row .u-col-100 { width: 500px !important; } }
                    @media only screen and (max-width: 520px) { .u-row-container { max-width: 100% !important; padding-left: 0px !important; padding-right: 0px !important; } .u-row { width: 100% !important; } .u-row .u-col { display: block !important; width: 100% !important; min-width: 320px !important; max-width: 100% !important; } .u-row .u-col > div { margin: 0 auto; } .u-row .u-col img { max-width: 100% !important; } }
                    body { margin: 0; padding: 0; } table, td, tr { border-collapse: collapse; vertical-align: top; } p { margin: 0; } * { line-height: inherit; }
                    table, td { color: #000000; } #u_body a { color: #0000ee; text-decoration: underline; }
                    </style>
                </head>

                <body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #e7e7e7;color: #000000">
                <table role="presentation" id="u_body" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #e7e7e7;width:100%" cellpadding="0" cellspacing="0">
                <tbody>
                <tr style="vertical-align: top">
                    <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                
                <div class="u-row-container" style="padding: 0px;background-color: transparent">
                <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 500px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                    <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
                <div class="u-col u-col-100" style="max-width: 320px;min-width: 500px;display: table-cell;vertical-align: top;">
                <div style="height: 100%;width: 100% !important;border-radius: 0px;">
                
                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="padding-right: 0px;padding-left: 0px;" align="center">
                    <img align="center" border="0" src=${process.env.HEADER_IMAGE} alt="" title="" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 100%;max-width: 480px;" width="480"/>
                    </td>
                </tr>
                </table>
                    </td>
                    </tr>
                </tbody>
                </table>

                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                    <h1 style="margin: 0px; line-height: 140%; text-align: center; word-wrap: break-word; font-size: 25px; font-weight: 400;"><span><strong>${title}</strong></span></h1>
                    </td>
                    </tr>
                </tbody>
                </table>

                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                <div style="font-size: 14px; line-height: 140%; text-align: left; word-wrap: break-word;">
                    <p style="line-height: 140%;">Hello <strong>${name},  </strong></p>
                    <div style="line-height: 140%; white-space: pre-wrap;">${content}</div>
                </div>
                    </td>
                    </tr>
                </tbody>
                </table>

                <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                <tbody>
                    <tr>
                    <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif;" align="left">
                <div style="font-size: 14px; line-height: 140%; text-align: left; word-wrap: break-word;">
                    <p style="line-height: 140%;"><span style="color: #000000; line-height: 19.6px;">Regards,</span><br /><span style="color: #000000; line-height: 19.6px;"><strong>${process.env.APP_NAME} Team</strong></span></p>
                </div>
                    </td>
                    </tr>
                </tbody>
                </table>

                </div>
                </div>
                    </div>
                </div>
                </div>
                
                    </td>
                </tr>
                </tbody>
                </table>
                </body>
                </html>`
};

module.exports = { resetPasswordTemplate, bookApprovalTemplate, bookRejectionTemplate };