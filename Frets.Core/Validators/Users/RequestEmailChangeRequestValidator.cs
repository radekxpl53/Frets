using FluentValidation;
using Frets.Core.DTOs.Users;

namespace Frets.Core.Validators.Users;

public class RequestEmailChangeRequestValidator : AbstractValidator<RequestEmailChangeRequest>
{
    public RequestEmailChangeRequestValidator()
    {
        RuleFor(x => x.NewEmail).NotEmpty().EmailAddress();
        RuleFor(x => x.CurrentPassword).NotEmpty();
    }
}
