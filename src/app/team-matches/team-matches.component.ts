import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-team-matches',
  templateUrl: './team-matches.component.html',
  styleUrls: ['./team-matches.component.css']
})
export class TeamMatchesComponent {
  @Input()
  currentTeam!: String;
}
